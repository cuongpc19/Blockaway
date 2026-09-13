# -*- coding: utf-8 -*-
"""Đọc GLB ra một mớ tam giác trong toạ độ thế giới.

Chỉ cần đúng ngần này cho việc dựng level: hình học thật, đã áp ma trận của
từng node. Không đụng tới vật liệu, ảnh, animation.

Nguồn mô hình do một session khác dựng và **vẫn đang sửa**, nên chỗ nào cũng
phải chịu được dữ liệu thiếu: primitive không có POSITION, node không có mesh,
accessor kiểu lạ — bỏ qua chứ không được ném lỗi làm hỏng cả mẻ 30 màn.
"""
import json
import struct
import numpy as np

COMP = {
    5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2),
    5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4),
}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def _chunks(buf):
    magic, _ver, _len = struct.unpack_from('<4sII', buf, 0)
    if magic != b'glTF':
        raise ValueError('không phải GLB')
    off, js, bn = 12, None, b''
    while off + 8 <= len(buf):
        clen, ctype = struct.unpack_from('<II', buf, off)
        data = buf[off + 8: off + 8 + clen]
        if ctype == 0x4E4F534A:
            js = json.loads(data.decode('utf-8'))
        elif ctype == 0x004E4942:
            bn = data
        off += 8 + clen + (-clen % 4)
    return js, bn


def _accessor(g, bn, idx):
    a = g['accessors'][idx]
    n = NCOMP[a['type']]
    fmt, size = COMP[a['componentType']]
    count = a['count']
    if 'bufferView' not in a:
        return np.zeros((count, n), dtype=np.float64)
    bv = g['bufferViews'][a['bufferView']]
    start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride') or n * size
    out = np.empty((count, n), dtype=np.float64)
    dt = np.dtype('<' + fmt)
    for i in range(count):
        o = start + i * stride
        out[i] = np.frombuffer(bn, dtype=dt, count=n, offset=o)
    return out


def _node_matrix(node):
    if 'matrix' in node:                       # glTF lưu theo cột
        return np.array(node['matrix'], dtype=np.float64).reshape(4, 4).T
    m = np.eye(4)
    if 'scale' in node:
        m = np.diag(list(node['scale']) + [1.0]) @ m
    if 'rotation' in node:
        x, y, z, w = node['rotation']
        r = np.array([
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 0],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 0],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), 0],
            [0, 0, 0, 1]])
        m = r @ m
    if 'translation' in node:
        t = np.eye(4)
        t[:3, 3] = node['translation']
        m = t @ m
    return m


def triangles(path):
    """Trả về mảng (T, 3, 3) toạ độ đỉnh tam giác trong toạ độ thế giới."""
    with open(path, 'rb') as f:
        g, bn = _chunks(f.read())
    if not g:
        return np.zeros((0, 3, 3))
    meshes = g.get('meshes', [])
    nodes = g.get('nodes', [])
    scene = g.get('scenes', [{}])[g.get('scene', 0)]
    out = []

    def walk(i, parent):
        node = nodes[i]
        M = parent @ _node_matrix(node)
        if 'mesh' in node:
            for prim in meshes[node['mesh']].get('primitives', []):
                if prim.get('mode', 4) != 4:            # chỉ lấy TRIANGLES
                    continue
                attr = prim.get('attributes', {})
                if 'POSITION' not in attr:
                    continue
                P = _accessor(g, bn, attr['POSITION'])
                if 'indices' in prim:
                    idx = _accessor(g, bn, prim['indices'])[:, 0].astype(np.int64)
                else:
                    idx = np.arange(len(P), dtype=np.int64)
                idx = idx[: (len(idx) // 3) * 3].reshape(-1, 3)
                if not len(idx):
                    continue
                V = np.concatenate([P, np.ones((len(P), 1))], axis=1) @ M.T
                out.append(V[:, :3][idx])
        for c in node.get('children', []):
            walk(c, M)

    for r in scene.get('nodes', range(len(nodes))):
        walk(r, np.eye(4))
    return np.concatenate(out, axis=0) if out else np.zeros((0, 3, 3))

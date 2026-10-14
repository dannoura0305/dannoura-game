#!/usr/bin/env python3
"""トビネズミMMO の素材をすべてコードで描いて tobinezumi/assets/ に書き出す。

    python3 tobinezumi/tools/make_assets.py            # 素材 + manifest.json
    python3 tobinezumi/tools/make_assets.py --preview  # さらにコンタクトシートと試し合成

依存：Pillow のみ。乱数はすべて固定シードなので、何度実行しても同じ PNG になる。
"""
from __future__ import annotations

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from pixart import Img, hstack, vstack, save, tohex  # noqa: E402
import art_jerboa as J  # noqa: E402
import art_field as F  # noqa: E402
import art_nest as N  # noqa: E402
import art_ui as U  # noqa: E402
import art_danger as DG  # noqa: E402
import art_family as FM  # noqa: E402

ROOT = os.path.normpath(os.path.join(HERE, '..'))
OUT = os.path.join(ROOT, 'assets')

FPS = {'idle': 3, 'hop': 10, 'walk': 10, 'bigjump': 12, 'jump': 10, 'gather': 6, 'dig': 8, 'eat': 5,
       'sleep': 1.5, 'climb': 8}
LOOP = {'idle': True, 'hop': True, 'walk': True, 'bigjump': False, 'jump': False, 'gather': False,
        'dig': True, 'eat': True, 'sleep': True, 'climb': True}


class Builder:
    def __init__(self):
        self.manifest = {}
        self.images = {}  # key -> list of Img (for the contact sheet)

    def put(self, key, rel, img, entry, frames_for_sheet=None):
        save(img, os.path.join(OUT, rel))
        e = {'file': rel}
        e.update(entry)
        self.manifest[key] = e
        self.images[key] = (img, e)


def build():
    B = Builder()

    # ------------------------------------------------------------- jerboa
    for anim in J.FIELD_ANIMS:
        ff = J.field_frames(anim)
        img = vstack([hstack(ff[d]) for d in ('down', 'up', 'side')])
        B.put('jerboa.field.%s' % anim, 'jerboa/field_%s.png' % anim, img,
              {'cell': [32, 32], 'frames': len(ff['down']), 'dirs': ['down', 'up', 'side'],
               'fps': FPS[anim], 'loop': LOOP[anim], 'anchor': [16, 29], 'side_faces': 'right'})
    for anim in J.SIDE_ANIMS:
        frames = [J.side_frame(p) for p in J.SIDE_POSES[anim]]
        B.put('jerboa.side.%s' % anim, 'jerboa/side_%s.png' % anim, hstack(frames),
              {'cell': [32, 32], 'frames': len(frames), 'fps': FPS[anim], 'loop': LOOP[anim],
               'anchor': [16, 29], 'faces': 'right'})
    B.put('jerboa.shadow', 'jerboa/shadow.png', J.shadow(), {'cell': [16, 8], 'anchor': [8, 4]})
    for fur, img in J.portraits().items():
        B.put('jerboa.portrait.%s' % fur, 'jerboa/portrait_%s.png' % fur, img, {'cell': [128, 128]})
    B.manifest['fur.palettes'] = dict(base=list(J.FUR_BASE), **{k: list(v) for k, v in J.FUR_PALETTES.items()})
    B.manifest['fur.order'] = list(J.FUR_ORDER)
    B.manifest['fur.labels'] = dict(J.FUR_LABELS)
    B.manifest['fur.keys'] = list(J.FUR_KEYS)

    # ------------------------------------------------------------- field tiles
    def strip(key, rel, imgs, extra=None):
        e = {'cell': [imgs[0].w, imgs[0].h], 'variants': len(imgs)}
        if extra:
            e.update(extra)
        B.put(key, rel, hstack(imgs), e)

    strip('tile.sand', 'field/sand.png', [F.ground_tile('sand', v) for v in range(4)])
    strip('tile.dirt', 'field/dirt.png', [F.ground_tile('dirt', v) for v in range(3)])
    strip('tile.grass', 'field/grass.png', [F.ground_tile('grass', v) for v in range(4)])
    strip('tile.water', 'field/water.png', [F.ground_tile('water', frame=f) for f in range(4)],
          {'anim': True, 'fps': 3})
    corner = {'autotile': 'corner4', 'bits': {'TL': 1, 'TR': 2, 'BR': 4, 'BL': 8}}
    strip('tile.trans.sand_dirt', 'field/trans_sand_dirt.png', F.transition('dirt', 'sand', 'dirt'),
          dict(corner, lower='sand', upper='dirt'))
    strip('tile.trans.dirt_grass', 'field/trans_dirt_grass.png', F.transition('grass', 'dirt', 'grass'),
          dict(corner, lower='dirt', upper='grass'))
    strip('tile.trans.sand_grass', 'field/trans_sand_grass.png', F.transition('grass', 'sand', 'grass'),
          dict(corner, lower='sand', upper='grass'))
    we = F.water_edges(4)
    B.put('tile.edge.water', 'field/water_edge.png', vstack([hstack(r) for r in we]),
          dict(corner, cell=[16, 16], variants=16, frames=4, fps=3, lower='sand', upper='water',
               note='rows = animation frames'))
    strip('tile.grass_tuft', 'field/grass_tuft.png', [F.grass_tuft(i) for i in range(4)], {'decor': True})
    strip('tile.pebbles', 'field/pebbles.png', [F.pebbles(i) for i in range(3)], {'decor': True})
    strip('tile.rock_big', 'field/rock_big.png', [F.rock(32, i) for i in range(2)],
          {'solid': True, 'anchor': [16, 28], 'footprint': [2, 1]})
    strip('tile.rock_small', 'field/rock_small.png', [F.rock(16, i) for i in range(2)],
          {'solid': True, 'anchor': [8, 14], 'footprint': [1, 1]})
    strip('tile.shrub', 'field/shrub.png', [F.shrub(i) for i in range(3)],
          {'solid': True, 'jumpable': True, 'anchor': [16, 28], 'footprint': [1, 1]})
    strip('tile.burrow', 'field/burrow.png', [F.burrow_entrance(True), F.burrow_entrance(False)],
          {'names': ['own', 'other'], 'anchor': [12, 10]})
    strip('tile.tree', 'field/tree.png', [F.tree()], {'solid': True, 'anchor': [24, 61], 'footprint': [1, 1]})

    # ------------------------------------------------------------- items
    for name in ('seed', 'grass', 'pebble'):
        B.put('item.%s.ground' % name, 'items/%s_ground.png' % name, F.item_ground(name),
              {'cell': [16, 16], 'anchor': [8, 13]})
        B.put('item.%s.icon' % name, 'items/%s_icon.png' % name, F.item_icon(name), {'cell': [16, 16]})

    # ------------------------------------------------------------- nest
    strip('nest.soil', 'nest/soil.png', [N.soil(i) for i in range(3)])
    strip('nest.rock', 'nest/rock.png', [N.rock_tile(i) for i in range(2)], {'diggable': False})
    strip('nest.surface', 'nest/surface.png', [N.surface(i) for i in range(3)])
    strip('nest.wall', 'nest/wall.png', [N.wall(i) for i in range(3)])
    strip('nest.edge', 'nest/edge.png', [N.edge(b) for b in range(16)],
          {'autotile': 'nsew4', 'bits': {'N': 1, 'E': 2, 'S': 4, 'W': 8},
           'note': 'overlay on a dug cell; bit set = that neighbour is solid soil'})
    strip('nest.tunnel_h', 'nest/tunnel_h.png', [N.tunnel_h()])
    strip('nest.tunnel_v', 'nest/tunnel_v.png', [N.tunnel_v()], {'ladder': True})
    strip('nest.tunnel_d', 'nest/tunnel_d.png', [N.tunnel_d()], {'rises': 'right', 'mirror_for': 'left'})
    strip('nest.straw', 'nest/straw.png', [N.straw(i) for i in range(2)])
    strip('nest.post', 'nest/post.png', [N.post()])
    strip('nest.brace', 'nest/brace.png', [N.brace()], {'corner': 'top-left', 'mirror_for': 'top-right'})
    strip('nest.bed', 'nest/bed.png', [N.bed()], {'anchor': [16, 15]})
    strip('nest.shelf', 'nest/shelf.png', [N.shelf()], {'anchor': [16, 31]})
    strip('nest.seed_pile', 'nest/seed_pile.png', [N.seed_pile(i) for i in range(3)],
          {'names': ['few', 'some', 'full'], 'anchor': [8, 15]})
    strip('nest.lantern', 'nest/lantern.png', [N.lantern(0), N.lantern(1)],
          {'anim': True, 'fps': 4, 'light': {'x': 8, 'y': 9, 'radius': 40, 'color': '#ffb050'}})
    strip('nest.pebble_deco', 'nest/pebble_deco.png', [N.pebble_deco()], {'anchor': [8, 15]})
    strip('nest.dried_flower', 'nest/dried_flower.png', [N.dried_flower()], {'anchor': [8, 15]})
    strip('nest.rug', 'nest/rug.png', [N.rug()], {'anchor': [16, 15]})
    strip('nest.entrance', 'nest/entrance.png', [N.entrance()], {'note': 'top 16px = surface row'})

    # ------------------------------------------------------------- Ver.0.3 危険と土地
    fx = DG.fox_sheet()
    B.put('pred.fox', 'danger/fox.png', hstack(fx),
          {'cell': [32, 24], 'frames': len(fx), 'names': ['run0', 'run1', 'run2', 'run3', 'idle', 'alert', 'dig0', 'dig1'],
           'anchor': [16, 22], 'faces': 'right', 'fps': 12})
    ow = DG.owl_sheet()
    B.put('pred.owl', 'danger/owl.png', hstack(ow), {'cell': [32, 32], 'frames': len(ow), 'names': ['fly0', 'fly1', 'dive'],
                                                    'anchor': [16, 16], 'faces': 'right', 'fps': 6})
    sn = DG.snake_sheet()
    B.put('pred.snake', 'danger/snake.png', hstack(sn), {'cell': [32, 16], 'frames': len(sn),
                                                        'names': ['coil0', 'coil1', 'rattle0', 'rattle1', 'lunge'],
                                                        'anchor': [15, 14], 'faces': 'right', 'fps': 4})
    strip('tile.puddle', 'danger/puddle.png', [DG.puddle(v) for v in range(2)], {'anchor': [8, 11]})
    for name in ('rare_seed', 'pretty_stone'):
        B.put('item.%s.ground' % name, 'items/%s_ground.png' % name, DG.rare_ground(name), {'cell': [16, 16], 'anchor': [8, 13]})
        B.put('item.%s.icon' % name, 'items/%s_icon.png' % name, DG.rare_icon(name), {'cell': [16, 16]})
    strip('tile.plug', 'danger/plug.png', [DG.plug()], {'anchor': [12, 10], 'note': 'overlay on tile.burrow (entrance plugged)'})
    strip('ui.land_flag', 'danger/land_flag.png', [DG.land_flag()], {'anchor': [5, 15]})
    strip('ui.alert', 'danger/alert.png', [DG.alert_icon()], {'anchor': [6, 13]})

    # ------------------------------------------------------------- Ver.0.4 いのちをつなぐ
    FM.build(B, strip)

    # ------------------------------------------------------------- ui
    img, sl = U.frame()
    B.put('ui.frame', 'ui/frame.png', img, {'cell': [img.w, img.h], 'slice': sl})
    imgs = [U.button(i)[0] for i in range(3)]
    B.put('ui.button', 'ui/button.png', hstack(imgs),
          {'cell': [16, 16], 'variants': 3, 'names': ['normal', 'hover', 'pressed'], 'slice': [5, 5, 5, 5]})
    names = ['dig', 'tunnel', 'bed', 'store', 'furniture', 'remove']
    B.put('ui.tools', 'ui/tools.png', hstack([U.tool_icon(n) for n in names]),
          {'cell': [16, 16], 'variants': 6, 'names': names,
           'labels': ['掘る', '通路', '寝床', '倉庫', '家具', '撤去']})
    B.put('ui.slot', 'ui/slot.png', hstack([U.slot(False), U.slot(True)]),
          {'cell': [20, 20], 'variants': 2, 'names': ['normal', 'selected'], 'slice': [4, 4, 4, 4]})
    img, sl = U.minimap_frame()
    B.put('ui.minimap', 'ui/minimap.png', img, {'cell': [img.w, img.h], 'slice': sl})
    img, sl, tail = U.bubble()
    B.put('ui.bubble', 'ui/bubble.png', img, {'cell': [16, 16], 'slice': sl})
    B.put('ui.bubble_tail', 'ui/bubble_tail.png', tail, {'cell': [tail.w, tail.h], 'anchor': [3, 3]})
    tags = [U.name_tag(False), U.name_tag(True)]
    B.put('ui.nametag', 'ui/nametag.png', hstack([t[0] for t in tags]),
          {'cell': [12, 12], 'variants': 2, 'names': ['other', 'self'], 'slice': tags[0][1]})
    B.put('ui.cursor', 'ui/cursor.png', hstack([U.cursor(k) for k in ('dig', 'place', 'invalid')]),
          {'cell': [16, 16], 'variants': 3, 'names': ['dig', 'place', 'invalid']})

    man = {'version': 1, 'generator': 'tobinezumi/tools/make_assets.py', 'outline': '#2a1a10',
           'tile': 16}
    man.update(B.manifest)
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(man, f, ensure_ascii=False, indent=1)
    return B


if __name__ == '__main__':
    B = build()
    total = 0
    for dp, dn, fn in os.walk(OUT):
        for n in fn:
            total += os.path.getsize(os.path.join(dp, n))
    print('assets: %d entries, %d bytes' % (len(B.manifest), total))
    if '--preview' in sys.argv:
        import preview
        preview.run(B)

// VRMA（VRM Animation 1.0）の読み込みと、クリップの組（clips.json：wakaba-clipset/1）。docs/wakaba-charkit/07・14 §3.2。
// three-vrm-animation（vendor/three-esm/three-vrm-animation-3.5.5・版固定）で読み、createVRMAnimationClip で normalized の骨のクリップにする。
// 根の動き（rootMotion:'xz'）のクリップは腰の水平の動きを抜いてその場の動きにし、抜いた距離から speedMS（速さ）を出す（distance matching に使う）。
import * as THREE from 'three';

let _va = null;
export async function vrmaModules() {
  if (!_va) {
    const [{ GLTFLoader }, VA] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('@pixiv/three-vrm-animation')]);
    _va = { GLTFLoader, VA };
  }
  return _va;
}

/** VRMA を読む（URL か ArrayBuffer）→ VRMAnimation（three-vrm-animation） */
export async function loadVRMA(src) {
  const { GLTFLoader, VA } = await vrmaModules();
  const loader = new GLTFLoader(); loader.register(p => new VA.VRMAnimationLoaderPlugin(p));
  const g = typeof src === 'string' ? await loader.loadAsync(src) : await loader.parseAsync(src, '');
  const a = g.userData.vrmAnimations && g.userData.vrmAnimations[0];
  if (!a) throw new Error('VRMA ではない（VRMC_vrm_animation が無い）');
  return { anim: a, extras: (g.parser && g.parser.json && g.parser.json.asset && g.parser.json.asset.extras) || null };
}

/** 腰（normalized の hips）の位置のトラック */
export const hipsTrackOf = (clip, vrm) => { const n = vrm.humanoid.getNormalizedBoneNode('hips'); return n ? clip.tracks.find(t => t.name === n.name + '.position') : null; };

/**
 * 根の動きを抜く（その場の動きにする）。腰の X・Z を最初のこまの値に（周期の直線の進みを引く）。
 * 戻り値：{ dist（m：最初 → 最後の水平の距離）, dx, dz }
 */
export function stripRootMotion(track) {
  if (!track) return { dist: 0, dx: 0, dz: 0 };
  const v = track.values, n = track.times.length; if (n < 2) return { dist: 0, dx: 0, dz: 0 };
  const x0 = v[0], z0 = v[2], dx = v[(n - 1) * 3] - x0, dz = v[(n - 1) * 3 + 2] - z0, T = track.times[n - 1] - track.times[0] || 1;
  for (let i = 0; i < n; i++) { const k = (track.times[i] - track.times[0]) / T; v[i * 3] -= dx * k; v[i * 3 + 2] -= dz * k; }
  // 平均のずれも 0 へ（その場で前後に揺れるだけにする）は、横の揺れを残すためしない
  return { dist: Math.hypot(dx, dz), dx, dz };
}

/**
 * クリップの組を読む。setUrl：clips.json の URL（ファイルの場所はここからの相対）。vrm：three-vrm の VRM。
 * 戻り値：{ clips: { id: { clip: AnimationClip, meta } }, errors: [], ms }
 */
export async function loadClipSet(setUrl, vrm, opt = {}) {
  const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  const fetchJ = opt.fetchJSON || (async u => { const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status + ' ' + u); return r.json(); });
  const fetchB = opt.fetchBinary || null;
  const set = typeof setUrl === 'object' && setUrl.clips ? setUrl : await fetchJ(setUrl);
  const base = typeof setUrl === 'string' ? setUrl : opt.base || '';
  const { VA } = await vrmaModules();
  // VRMA の視線のクリップのための代わりの節（無いと three-vrm-animation が毎回作って警告を出す）
  try { if (vrm.lookAt && VA.VRMLookAtQuaternionProxy && !vrm.scene.children.some(o => o instanceof VA.VRMLookAtQuaternionProxy)) { const px = new VA.VRMLookAtQuaternionProxy(vrm.lookAt); px.name = 'lookAtQuaternionProxy'; vrm.scene.add(px); } } catch (e) { /* 古い版 */ }
  const out = { clips: {}, errors: [], spec: set.spec, test: !!set.test, ms: 0 };
  const ids = Object.keys(set.clips || {}).filter(id => !opt.only || opt.only.includes(id));
  await Promise.all(ids.map(async id => {
    const meta = Object.assign({ id }, set.clips[id]);
    try {
      const url = base ? new URL(meta.file, new URL(base, typeof location !== 'undefined' ? location.href : 'file:///')).href : meta.file;
      const { anim, extras } = await loadVRMA(fetchB ? await fetchB(url, meta.file) : url);
      const clip = VA.createVRMAnimationClip(anim, vrm); clip.name = id;
      // 歩幅の倍率：このモデルの腰の高さ ÷ 動きを録った人の腰の高さ（three-vrm-animation が腰の位置に掛けるのと同じ比）
      try { const hr = vrm.humanoid.normalizedRestPose.hips.position[1], ar = anim.restHipsPosition && anim.restHipsPosition.y; meta.strideScale = hr > 0 && ar > 0 ? hr / ar : 1; } catch (e) { meta.strideScale = 1; }
      const rm = meta.rootMotion || 'none';
      if (rm !== 'none') {
        const r = stripRootMotion(hipsTrackOf(clip, vrm));
        meta.rootDistM = r.dist;
        if (meta.speedMS == null && meta.loop && clip.duration > 0) meta.speedMS = r.dist / clip.duration;
      }
      if (meta.durationS == null) meta.durationS = clip.duration;
      if (!meta.events && extras && extras.wakaba && extras.wakaba.events) meta.events = extras.wakaba.events;
      out.clips[id] = { clip, meta };
    } catch (e) { out.errors.push(id + '：' + (e && e.message || e)); }
  }));
  out.ms = Math.round((typeof performance !== 'undefined' ? performance : Date).now() - t0);
  return out;
}

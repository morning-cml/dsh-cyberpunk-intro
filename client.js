/**
 * dsh-cyberpunk-intro — browser half.
 *
 * Mounts one full-window <video> in `shell.overlay` the first time the DSH page
 * loads in a window, plays the clip, then fades out and renders nothing.
 * Esc or the skip button ends it early; any playback failure ends it at once,
 * so the overlay can never leave the window black.
 */
window.__ModuleLoader__.load({
  id: 'dsh-cyberpunk-intro',
  factory(require) {
    const React = require('react')
    const { useEffect, useRef, useState } = React
    const h = React.createElement

    const SRC = '/dsh-cyberpunk-intro/intro.mp4'
    // sessionStorage lives as long as the window: reloading inside one DSH run
    // does not replay the intro, the next launch does.
    const PLAYED_KEY = 'dsh-cyberpunk-intro:played'
    const FADE_MS = 600
    // Upper bound on the whole overlay (the clip is ~7 s): a stalled load must
    // not hold the window hostage.
    const MAX_MS = 20000

    function playedThisLaunch() {
      try {
        return sessionStorage.getItem(PLAYED_KEY) !== null
      } catch {
        return false
      }
    }

    function markPlayed() {
      try {
        sessionStorage.setItem(PLAYED_KEY, '1')
      } catch {
        /* storage unavailable: the intro plays once per page load instead */
      }
    }

    /** Drop the decoder and the buffered 4K frames now rather than at GC. */
    function release(video) {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }

    const CSS = `
.dci-root{position:fixed;inset:0;z-index:2147483000;background:#000;overflow:hidden;
  opacity:1;transition:opacity ${FADE_MS}ms ease}
.dci-root.dci-leaving{opacity:0;pointer-events:none}
.dci-video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block;background:#000}
.dci-skip{position:absolute;right:28px;bottom:24px;margin:0;padding:6px 16px;
  border:1px solid rgba(150,210,255,.35);border-radius:999px;background:rgba(0,0,0,.4);
  color:rgba(220,240,255,.85);font:500 12px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;
  letter-spacing:.2em;cursor:pointer;opacity:0;transition:opacity .25s ease,background .2s ease}
.dci-root:hover .dci-skip,.dci-skip:focus-visible{opacity:1}
.dci-skip:hover{background:rgba(30,110,190,.45);color:#fff}
@media (prefers-reduced-motion:reduce){.dci-root{transition:none}}
`

    function Intro() {
      const videoRef = useRef(null)
      const finishRef = useRef(() => {})
      const [phase, setPhase] = useState('playing') // playing -> leaving -> done

      useEffect(() => {
        const video = videoRef.current
        if (video === null) return undefined
        let finished = false
        let watchdog = 0
        let unmount = 0

        const onKey = (event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          event.stopPropagation()
          finish()
        }

        const finish = () => {
          if (finished) return
          finished = true
          clearTimeout(watchdog)
          window.removeEventListener('keydown', onKey, true)
          video.pause()
          setPhase('leaving')
          unmount = setTimeout(() => {
            release(video)
            setPhase('done')
          }, FADE_MS + 50)
        }
        finishRef.current = finish

        const start = () => {
          watchdog = setTimeout(finish, MAX_MS)
          // The clip has no audio track; muted also keeps autoplay allowed in a
          // browser tab that has no user gesture yet.
          video.muted = true
          video.play().catch(finish)
        }

        const onVisible = () => {
          if (document.visibilityState === 'hidden') return
          document.removeEventListener('visibilitychange', onVisible)
          start()
        }

        video.addEventListener('playing', markPlayed)
        video.addEventListener('ended', finish)
        video.addEventListener('error', finish)
        window.addEventListener('keydown', onKey, true)
        // A window launched hidden (tray, minimized) waits until it is seen.
        if (document.visibilityState === 'hidden') document.addEventListener('visibilitychange', onVisible)
        else start()

        return () => {
          finished = true
          clearTimeout(watchdog)
          clearTimeout(unmount)
          document.removeEventListener('visibilitychange', onVisible)
          window.removeEventListener('keydown', onKey, true)
          video.removeEventListener('playing', markPlayed)
          video.removeEventListener('ended', finish)
          video.removeEventListener('error', finish)
          release(video)
        }
      }, [])

      if (phase === 'done') return null
      return h(
        'div',
        { className: phase === 'leaving' ? 'dci-root dci-leaving' : 'dci-root', role: 'presentation' },
        h('style', null, CSS),
        h('video', {
          ref: videoRef,
          className: 'dci-video',
          src: SRC,
          preload: 'auto',
          muted: true,
          playsInline: true,
          disablePictureInPicture: true,
          disableRemotePlayback: true,
        }),
        h('button', { type: 'button', className: 'dci-skip', onClick: () => finishRef.current() }, '跳过'),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        if (playedThisLaunch()) return
        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register({ name: 'shell.overlay', id: 'dsh-cyberpunk-intro', order: 900 }, Intro),
        )
      },
    }
  },
})

/**
 * Minimal WebRTC viewer page for the capacity harness (SEC-192).
 *
 * Why not Ant Media's own `play.html`: measuring against it put ~9 seconds of
 * client-side bootstrap (ES module loading, video.js init, its UI) in front of
 * every "time to first frame", before a single packet was requested. That is not
 * server capacity, and it made the threshold meaningless — the first calibration
 * run reported 27s p95 on an idle server.
 *
 * It also costs: every viewer would run a full video.js player, so the local
 * machine tops out at fewer concurrent viewers, which lowers the ceiling this
 * harness can prove.
 *
 * So this speaks the AMS signaling protocol directly. The message shapes were
 * read off a live session against the production server, not from docs:
 *
 *   -> {"command":"play","streamId":X,"token":T,"room":"","trackList":[],"subscriberId":""}
 *   <- {"command":"takeConfiguration","type":"offer","sdp":...}
 *   -> {"command":"takeConfiguration","streamId":X,"type":"answer","sdp":...}
 *   <-> {"command":"takeCandidate","label":N,"id":"M","candidate":...}
 *   <- {"command":"notification","definition":"play_started"}
 *
 * The page exposes its state on `window.__viewer` for the runner to poll.
 */
export const VIEWER_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>primex loadtest viewer</title></head>
<body style="margin:0;background:#000">
<video id="v" autoplay playsinline muted style="width:160px;height:90px"></video>
<script>
const params = new URLSearchParams(location.search);
const wsUrl = params.get('ws');
const streamId = params.get('streamId');
const token = params.get('token') || '';

const state = {
  t0: Date.now(),
  playStartedMs: null,   // AMS said the stream is playing
  firstFrameMs: null,    // a frame actually painted
  error: null,
  iceState: null,
};
window.__viewer = state;

const video = document.getElementById('v');
const pc = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
});

pc.oniceconnectionstatechange = () => { state.iceState = pc.iceConnectionState; };
pc.ontrack = (e) => { if (!video.srcObject) video.srcObject = e.streams[0]; };

// currentTime advancing is the only honest "it is playing" signal; readyState
// alone is satisfied by metadata.
const tick = setInterval(() => {
  if (state.firstFrameMs === null && video.readyState >= 2 && video.currentTime > 0) {
    state.firstFrameMs = Date.now() - state.t0;
    clearInterval(tick);
  }
}, 100);

const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  ws.send(JSON.stringify({
    command: 'play', streamId, token, room: '', trackList: [], subscriberId: '',
  }));
};

ws.onerror = () => { state.error = state.error || 'websocket error'; };
ws.onclose = () => { state.error = state.error || 'websocket closed'; };

pc.onicecandidate = (e) => {
  if (!e.candidate || ws.readyState !== 1) return;
  ws.send(JSON.stringify({
    command: 'takeCandidate',
    streamId,
    label: e.candidate.sdpMLineIndex,
    id: e.candidate.sdpMid,
    candidate: e.candidate.candidate,
  }));
};

ws.onmessage = async (event) => {
  const msg = JSON.parse(event.data);

  if (msg.command === 'takeConfiguration' && msg.type === 'offer') {
    await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    ws.send(JSON.stringify({
      command: 'takeConfiguration', streamId, type: 'answer', sdp: answer.sdp,
    }));
  } else if (msg.command === 'takeCandidate') {
    await pc.addIceCandidate({
      sdpMLineIndex: msg.label, sdpMid: msg.id, candidate: msg.candidate,
    }).catch(() => {});
  } else if (msg.command === 'notification') {
    if (msg.definition === 'play_started') state.playStartedMs = Date.now() - state.t0;
    // no_stream_exists, streamIdInUse, unauthorized, ... all land here
    if (/error|no_stream|unauthor|not_allowed/i.test(msg.definition || '')) {
      state.error = msg.definition;
    }
  } else if (msg.command === 'error') {
    state.error = msg.definition || 'error';
  }
};
</script>
</body></html>`

<script setup lang="ts">
import { PhoneOff, Mic, MicOff, Video, VideoOff, AlertCircle } from 'lucide-vue-next'

const store = useSocialStore()
const { activeCall } = storeToRefs(store)

const localVideoEl = ref<HTMLVideoElement | null>(null)
const remoteVideoEl = ref<HTMLVideoElement | null>(null)
const localStream = ref<MediaStream | null>(null)
const pc = ref<RTCPeerConnection | null>(null)
const isConnected = ref(false)
const isMuted = ref(false)
const isCamOff = ref(false)
const mediaError = ref('')
const callDuration = ref(0)
const statusLabel = ref('Đang kết nối...')

// Buffer ICE candidates that arrive before remote description is set
const iceCandidateBuffer = ref<RTCIceCandidateInit[]>([])
let remoteDescSet = false

let durationTimer: ReturnType<typeof setInterval> | null = null
let ringTimeoutId: ReturnType<typeof setTimeout> | null = null

function clearRingTimeout() {
  if (ringTimeoutId) { clearTimeout(ringTimeoutId); ringTimeoutId = null }
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

const durationLabel = computed(() => {
  const m = Math.floor(callDuration.value / 60).toString().padStart(2, '0')
  const s = (callDuration.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

// Tạo PeerConnection với event handlers — không cần media để bắt đầu
function createPeerConnection(): RTCPeerConnection {
  const conn = new RTCPeerConnection(ICE_SERVERS)

  conn.ontrack = (event) => {
    if (remoteVideoEl.value && event.streams[0]) {
      remoteVideoEl.value.srcObject = event.streams[0]
      isConnected.value = true
      statusLabel.value = ''
      startTimer()
    }
  }

  conn.onicecandidate = (event) => {
    if (event.candidate && activeCall.value) {
      store.sendWsSignal('call_ice', activeCall.value.targetUserId, event.candidate.toJSON())
    }
  }

  conn.onconnectionstatechange = () => {
    if (conn.connectionState === 'connected') {
      isConnected.value = true
      statusLabel.value = ''
      startTimer()
    }
    if (conn.connectionState === 'disconnected' || conn.connectionState === 'failed') {
      hangUp(false)
    }
  }

  pc.value = conn
  return conn
}

// Gắn media vào senders sau khi offer/answer đã gửi — chạy ngầm, không block signaling
async function attachMedia(audioSender: RTCRtpSender | null, videoSender: RTCRtpSender | null) {
  let stream: MediaStream | null = null
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  } catch {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
      isCamOff.value = true
    } catch {
      isCamOff.value = true
      isMuted.value = true
      mediaError.value = 'Không truy cập được camera/micro'
      return
    }
  }
  if (!stream || !pc.value) return
  localStream.value = stream
  await nextTick()
  if (localVideoEl.value) localVideoEl.value.srcObject = stream
  for (const track of stream.getTracks()) {
    try {
      if (track.kind === 'audio' && audioSender) await audioSender.replaceTrack(track)
      if (track.kind === 'video' && videoSender) await videoSender.replaceTrack(track)
    } catch { /* sender có thể đã đóng */ }
  }
}

// Caller: gửi offer NGAY (không chờ camera) — media gắn vào sau qua replaceTrack
async function initiateCall() {
  if (!activeCall.value) return

  const conn = createPeerConnection()
  const audioTr = conn.addTransceiver('audio', { direction: 'sendrecv' })
  const videoTr = conn.addTransceiver('video', { direction: 'sendrecv' })

  const offer = await conn.createOffer()
  await conn.setLocalDescription(offer)
  store.sendWsSignal('call_offer', activeCall.value.targetUserId, conn.localDescription!.toJSON())
  console.debug('[VideoCall] call_offer sent to', activeCall.value.targetUserId)
  statusLabel.value = 'Đang chờ đối phương...'

  // Tự động huỷ nếu không có phản hồi sau 30 giây
  ringTimeoutId = setTimeout(() => {
    statusLabel.value = 'Không có phản hồi'
    setTimeout(() => hangUp(true), 1500)
  }, 30_000)

  attachMedia(audioTr.sender, videoTr.sender)
}

// Callee: gửi answer NGAY — media gắn vào sau qua replaceTrack
async function answerCall() {
  if (!activeCall.value?.initialSignal) return

  const conn = createPeerConnection()
  await conn.setRemoteDescription(
    new RTCSessionDescription(activeCall.value.initialSignal as RTCSessionDescriptionInit),
  )
  remoteDescSet = true

  for (const c of iceCandidateBuffer.value) {
    try { await conn.addIceCandidate(new RTCIceCandidate(c)) } catch { /* non-fatal */ }
  }
  iceCandidateBuffer.value = []

  const answer = await conn.createAnswer()
  await conn.setLocalDescription(answer)
  store.sendWsSignal('call_answer', activeCall.value.targetUserId, conn.localDescription!.toJSON())

  // Lấy senders từ transceivers được tạo bởi setRemoteDescription
  const trs = conn.getTransceivers()
  const audioSender = trs.find((t) => t.receiver.track?.kind === 'audio')?.sender ?? null
  const videoSender = trs.find((t) => t.receiver.track?.kind === 'video')?.sender ?? null
  attachMedia(audioSender, videoSender)
}

// Watch queue length — drain all events in order, none get overwritten
watch(
  () => store.callEventQueue.length,
  async () => {
    while (store.callEventQueue.length > 0) {
      const event = store.dequeueCallEvent()
      if (!event) break
      await processCallEvent(event)
    }
  },
)

async function processCallEvent(event: { type: string; data: unknown }) {
  if (event.type === 'call_answer' && pc.value) {
    clearRingTimeout()
    try {
      await pc.value.setRemoteDescription(new RTCSessionDescription(event.data as RTCSessionDescriptionInit))
      remoteDescSet = true
      for (const c of iceCandidateBuffer.value) {
        try { await pc.value.addIceCandidate(new RTCIceCandidate(c)) } catch { /* non-fatal */ }
      }
      iceCandidateBuffer.value = []
      statusLabel.value = 'Đang thiết lập...'
    } catch { /* ignore */ }
  } else if (event.type === 'call_ice' && event.data) {
    if (pc.value && remoteDescSet) {
      try { await pc.value.addIceCandidate(new RTCIceCandidate(event.data as RTCIceCandidateInit)) } catch { /* non-fatal */ }
    } else {
      iceCandidateBuffer.value.push(event.data as RTCIceCandidateInit)
    }
  } else if (event.type === 'call_end' || event.type === 'call_reject') {
    hangUp(false)
  } else if (event.type === 'call_unavailable') {
    clearRingTimeout()
    console.debug('[VideoCall] receiver is offline')
    statusLabel.value = 'Người dùng không trực tuyến'
    setTimeout(() => hangUp(false), 2000)
  }
}

function hangUp(sendSignal = true) {
  pc.value?.close()
  pc.value = null
  localStream.value?.getTracks().forEach((t) => t.stop())
  localStream.value = null
  stopTimer()
  remoteDescSet = false
  iceCandidateBuffer.value = []
  if (sendSignal) {
    store.endActiveCall()
  } else {
    // Called from WS event — clear state without sending signal again
    store.clearActiveCall()
  }
}

function toggleMute() {
  isMuted.value = !isMuted.value
  localStream.value?.getAudioTracks().forEach((t) => (t.enabled = !isMuted.value))
}

function toggleCam() {
  isCamOff.value = !isCamOff.value
  localStream.value?.getVideoTracks().forEach((t) => (t.enabled = !isCamOff.value))
}

function startTimer() {
  if (durationTimer) return
  durationTimer = setInterval(() => callDuration.value++, 1000)
}
function stopTimer() {
  if (durationTimer) { clearInterval(durationTimer); durationTimer = null }
  callDuration.value = 0
}

onMounted(async () => {
  if (!activeCall.value) return
  try {
    if (activeCall.value.mode === 'caller') {
      await initiateCall()
    } else {
      await answerCall()
    }
  } catch (err) {
    statusLabel.value = 'Lỗi kết nối'
    console.error('[VideoCall]', err)
  }
})

onUnmounted(() => {
  clearRingTimeout()
  pc.value?.close()
  localStream.value?.getTracks().forEach((t) => t.stop())
  stopTimer()
})
</script>

<template>
  <div v-if="activeCall" class="fixed inset-0 z-[200] flex items-center justify-center bg-black">
    <!-- Remote video -->
    <video
      ref="remoteVideoEl"
      autoplay
      playsinline
      class="h-full w-full object-cover"
      :class="{ 'opacity-0': !isConnected }"
    />

    <!-- Waiting overlay -->
    <div v-if="!isConnected" class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950">
      <img
        :src="activeCall.targetAvatar"
        :alt="activeCall.targetName"
        class="h-28 w-28 rounded-full object-cover ring-4 ring-white/20"
        referrerpolicy="no-referrer"
      />
      <p class="text-2xl font-bold text-white">{{ activeCall.targetName }}</p>
      <p class="text-sm text-white/60 animate-pulse">{{ statusLabel }}</p>
      <div v-if="mediaError" class="flex items-center gap-1.5 rounded-full bg-amber-900/40 px-3 py-1 text-xs text-amber-300">
        <AlertCircle class="h-3.5 w-3.5 shrink-0" />
        {{ mediaError }}
      </div>
    </div>

    <!-- Duration -->
    <div v-if="isConnected" class="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
      {{ durationLabel }}
    </div>

    <!-- Local PiP (bottom-right) -->
    <div class="absolute bottom-24 right-4 h-32 w-24 overflow-hidden rounded-2xl border-2 border-white/20 shadow-2xl md:h-40 md:w-28">
      <video
        ref="localVideoEl"
        autoplay
        playsinline
        muted
        class="h-full w-full object-cover"
        :class="{ 'opacity-0': isCamOff }"
      />
      <div v-if="isCamOff" class="absolute inset-0 flex items-center justify-center bg-slate-800">
        <VideoOff class="h-6 w-6 text-slate-400" />
      </div>
    </div>

    <!-- Controls -->
    <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
      <button
        class="flex h-14 w-14 items-center justify-center rounded-full transition"
        :class="isMuted ? 'bg-slate-600 text-white' : 'bg-white/20 text-white hover:bg-white/30'"
        @click="toggleMute"
      >
        <MicOff v-if="isMuted" class="h-6 w-6" />
        <Mic v-else class="h-6 w-6" />
      </button>

      <button
        class="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition"
        @click="hangUp(true)"
      >
        <PhoneOff class="h-7 w-7" />
      </button>

      <button
        class="flex h-14 w-14 items-center justify-center rounded-full transition"
        :class="isCamOff ? 'bg-slate-600 text-white' : 'bg-white/20 text-white hover:bg-white/30'"
        @click="toggleCam"
      >
        <VideoOff v-if="isCamOff" class="h-6 w-6" />
        <Video v-else class="h-6 w-6" />
      </button>
    </div>
  </div>
</template>

export interface LoopbackCapture {
  stream: MediaStream
  audioTrack: MediaStreamTrack
}

/**
 * Pede o áudio do sistema. O main process responde com a tela + 'loopback'
 * sem diálogo. A track de vídeo só existe porque o Chromium exige; pedimos
 * o mínimo e paramos logo em seguida.
 */
export async function captureSystemAudio(): Promise<LoopbackCapture> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: { width: 1, height: 1, frameRate: 1 }
  })

  for (const track of stream.getVideoTracks()) {
    track.stop()
    stream.removeTrack(track)
  }

  const audioTrack = stream.getAudioTracks()[0]
  if (!audioTrack) {
    throw new Error('getDisplayMedia não devolveu track de áudio (loopback indisponível?)')
  }
  return { stream, audioTrack }
}

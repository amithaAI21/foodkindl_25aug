
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

export default function FoodWalkVoiceAssistant({
  instruction,
  navigationActive,
  onStopNavigation,
  onUpdateRoute,
}) {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [listening, setListening] = useState(false);
  const [lastCommand, setLastCommand] = useState("");
  const [error, setError] = useState("");

  const recognitionRef = useRef(null);
  const lastSpokenRef = useRef("");
  const speakRef = useRef(null);

  const canSpeak =
    typeof window !== "undefined" &&
    "speechSynthesis" in window;

  const canRecognize =
    typeof window !== "undefined" &&
    Boolean(
      window.SpeechRecognition ||
      window.webkitSpeechRecognition
    );

  function speak(text, force = false) {
    if (!canSpeak || !text || !voiceEnabled) return;

    if (!force && lastSpokenRef.current === text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    lastSpokenRef.current = text;

    window.speechSynthesis.speak(utterance);
  }

  speakRef.current = speak;

  // Announce new navigation instructions only once.
  useEffect(() => {
    if (!navigationActive || !instruction) return;

    speakRef.current?.(instruction);
  }, [instruction, navigationActive, voiceEnabled]);

  useEffect(() => {
    if (navigationActive) return;

    window.speechSynthesis?.cancel();
    lastSpokenRef.current = "";
  }, [navigationActive]);

  function handleVoiceCommand(command) {
    const text = command.toLowerCase().trim();

    setLastCommand(command);

    if (text.includes("repeat")) {
      speakRef.current?.(instruction, true);
    } else if (
      text.includes("mute") ||
      text.includes("silence")
    ) {
      setVoiceEnabled(false);
      window.speechSynthesis?.cancel();
    } else if (
      text.includes("unmute") ||
      text.includes("enable voice")
    ) {
      setVoiceEnabled(true);
    } else if (
      text.includes("update route") ||
      text.includes("recalculate")
    ) {
      onUpdateRoute?.();
    } else if (
      text.includes("stop navigation")
    ) {
      onStopNavigation?.();
    } else {
      setError("Command not recognized. Please try again.");
    }
  }

  function startListening() {
    if (!canRecognize) {
      setError(
        "Voice recognition is unavailable in this browser."
      );
      return;
    }

    setError("");

    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    const recognition = new Recognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const command =
        event.results?.[0]?.[0]?.transcript || "";

      handleVoiceCommand(command);
    };

    recognition.onerror = (event) => {
  setListening(false);

  if (event.error === "no-speech") {
    setError(
      "I couldn't hear you. Tap the microphone and speak again."
    );
    return;
  }

  if (event.error === "not-allowed") {
    setError(
      "Microphone permission is blocked. Allow it in your browser settings."
    );
    return;
  }

  if (event.error === "audio-capture") {
    setError(
      "No working microphone was detected. Check your audio input settings."
    );
    return;
  }

  if (event.error === "network") {
    setError(
      "Speech recognition is temporarily unavailable. Check your connection."
    );
    return;
  }

  setError("Voice recognition failed. Please try again.");
};

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch {
      setError("Unable to start voice recognition.");
      setListening(false);
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function toggleVoice() {
    if (voiceEnabled) {
      window.speechSynthesis?.cancel();
      setVoiceEnabled(false);
    } else {
      setVoiceEnabled(true);
      lastSpokenRef.current = "";
    }
  }

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  return (
    <section className="fw-voice-panel">
      <div className="fw-voice-heading">
        <Volume2 size={20} />
        <div>
          <strong>FoodKindl Voice Assistant</strong>
          <small>
            Voice guidance and hands-free commands
          </small>
        </div>
      </div>

      <div className="fw-voice-instruction">
        {instruction || "Waiting for route instructions"}
      </div>

      <div className="fw-voice-actions">
        <button
          type="button"
          onClick={toggleVoice}
          disabled={!canSpeak}
        >
          {voiceEnabled ? (
            <VolumeX size={18} />
          ) : (
            <Volume2 size={18} />
          )}
          {voiceEnabled ? "Mute" : "Enable voice"}
        </button>

        <button
          type="button"
          onClick={() =>
            speakRef.current?.(instruction, true)
          }
          disabled={!instruction || !voiceEnabled}
        >
          Repeat direction
        </button>

        <button
          type="button"
          onClick={
            listening ? stopListening : startListening
          }
          disabled={!canRecognize}
        >
          {listening ? (
            <MicOff size={18} />
          ) : (
            <Mic size={18} />
          )}
          {listening ? "Stop listening" : "Voice command"}
        </button>
      </div>

      {lastCommand && (
        <p className="fw-voice-feedback">
          Heard: "{lastCommand}"
        </p>
      )}

      {error && (
        <p role="alert" className="fw-voice-error">
          {error}
        </p>
      )}
    </section>
  );
}

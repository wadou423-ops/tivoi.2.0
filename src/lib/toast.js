"use client";

export function toast(message, type = "info") {
  window.dispatchEvent(new CustomEvent("tivoi-toast", { detail: { message, type } }));
}

// Small helpers so pages can toast errors/success consistently without juggling local err state.

export function errorMessage(err, fallback = "Something went wrong") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || fallback;
  const msg = err?.message || err?.error || err?.detail;
  if (typeof msg === "string" && msg.trim()) return msg;
  try {
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
}

export function toastError(toast, err, fallback = "Request failed", opts = {}) {
  const msg = errorMessage(err, fallback);
  return toast({
    title: opts.title || "Error",
    description: msg,
    variant: "destructive",
    duration: opts.duration ?? 3200,
  });
}

export function toastSuccess(toast, title, description, opts = {}) {
  return toast({
    title: title || "Success",
    description,
    variant: "success",
    duration: opts.duration ?? 2200,
  });
}

export function toastInfo(toast, title, description, opts = {}) {
  return toast({
    title: title || "Info",
    description,
    variant: "info",
    duration: opts.duration ?? 2200,
  });
}

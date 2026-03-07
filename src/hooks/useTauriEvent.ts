import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";

// Subscribe to events from the rust backend
export function useTauriEvent(
  eventName: string,
  handler: (payload: unknown) => void,
) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    let unlisten: UnlistenFn;

    const setupListener = async () => {
      unlisten = await listen(eventName, (event) => {
        handlerRef.current(event.payload);
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [eventName]);
}

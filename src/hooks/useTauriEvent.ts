import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";

export function useTauriEvent(
  eventName: string,
  handler: (payload: unknown) => void,
) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    const setupListener = async () => {
      if (!listen) {
        console.log("Tauri events not available in web mode");
        return;
      }
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

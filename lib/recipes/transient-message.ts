/** Each new interaction invalidates both the previous timeout and pending async result. */
export function createTransientMessage(publish: (message: string | undefined) => void, duration = 2000) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let version = 0;
  function cancel() {
    clearTimeout(timeout);
    version++;
  }
  return {
    cancel,
    begin() {
      cancel();
      publish(undefined);
      const request = version;
      return (message: string) => {
        if (request !== version) return;
        clearTimeout(timeout);
        publish(message);
        timeout = setTimeout(() => publish(undefined), duration);
      };
    },
  };
}

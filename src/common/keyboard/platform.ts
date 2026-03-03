export const isMac: boolean =
  typeof navigator !== 'undefined'
    ? (
        (navigator as Navigator & { userAgentData?: { platform?: string } })
          .userAgentData?.platform ?? navigator.platform
      )
        .toLowerCase()
        .includes('mac')
    : false;

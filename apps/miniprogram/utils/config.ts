function getDefaultApiBase(): string {
  return "https://api.poker.lmqstudio.com/api";
}

function getDefaultWsBase(): string {
  return "https://api.poker.lmqstudio.com/practice-room";
}

export const config = {
  apiBaseUrl: getDefaultApiBase(),
  wsBaseUrl: getDefaultWsBase()
};

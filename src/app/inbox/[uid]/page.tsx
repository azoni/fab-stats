import ChatPage from "./ChatPage";

export function generateStaticParams() {
  return [{ uid: "_" }];
}

export default function ChatPageRoute() {
  return <ChatPage />;
}

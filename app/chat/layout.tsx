import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Chat", template: "%s · Pulse" },
};

export default function ChatLayout({ children }: LayoutProps<"/chat">) {
  return <div className="flex flex-1">{children}</div>;
}

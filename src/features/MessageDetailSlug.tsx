import { Message } from "../data/DTO";
import "./MessageDetailSlug.css";

export const MessageDetailSlug = ({ message }: { message: Message | null }) => {
  return (
    <div className="message-detail-slug">
      <div className="message-detail-slug-item">
        <div>{`From:`}</div>
        <div>{message?.from}</div>
        <div>{`To:`}</div>
        <div>{message?.to}</div>
        <div>{`Subject:`}</div>
        <div>{message?.subject}</div>
      </div>
      <div className="message-detail-slug-item">
        <div>{`Sent:`}</div>
        <div>{message?.date}</div>
      </div>
    </div>
  );
};

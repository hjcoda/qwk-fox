import { Message } from "../data/DTO";
import "./MessageDetailSlug.css";

type MessageDetailSlugProps = {
  message: Message | null;
};

export const MessageDetailSlug = ({ message }: MessageDetailSlugProps) => {
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
        {message?.header?.x_ftn_chrs && (
          <>
            <div>{`Encoding:`}</div>
            <div>{message?.header?.x_ftn_chrs}</div>
          </>
        )}
      </div>
    </div>
  );
};

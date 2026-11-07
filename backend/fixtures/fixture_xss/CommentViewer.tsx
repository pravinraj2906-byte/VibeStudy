import React from 'react';

interface CommentProps {
  user: string;
  body: string;
}

export const CommentViewer: React.FC<CommentProps> = ({ user, body }) => {
  // VULNERABLE: Direct HTML injection without DOMPurify
  return (
    <div className="comment-box">
      <h4>{user}</h4>
      <div dangerouslySetInnerHTML={{ __html: body }} />
    </div>
  );
};

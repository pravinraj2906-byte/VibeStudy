import React from 'react';

export const CommentView = ({ userComment }: { userComment: string }) => {
  // SAFE: Default React JSX expression auto-escapes special characters
  return <div className="user-comment">{userComment}</div>;
};

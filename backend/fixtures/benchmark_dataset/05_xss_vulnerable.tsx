import React from 'react';

export const CommentView = ({ userComment }: { userComment: string }) => {
  // VULNERABLE: Direct HTML injection bypasses React escaping
  return <div dangerouslySetInnerHTML={{ __html: userComment }} />;
};

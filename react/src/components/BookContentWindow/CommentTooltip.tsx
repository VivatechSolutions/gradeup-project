import React from 'react';
import './CommentTooltip.css';

interface CommentTooltipProps {
  comment: string;
  children: React.ReactNode;
  onClick: () => void;
}

const CommentTooltip: React.FC<CommentTooltipProps> = ({ comment, children, onClick }) => {
  return (
    <span className="comment-tooltip-wrapper" onClick={onClick}>
      {children}
      <span className="comment-tooltip">
        {comment}
      </span>
    </span>
  );
};

export default CommentTooltip;

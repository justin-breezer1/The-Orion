import React from 'react';

/**
 * Extracts usernames from a string that start with @
 * Example: "Hello @dev and @admin" -> ["dev", "admin"]
 */
export const extractMentions = (text: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex);
  if (!matches) return [];
  return matches.map(match => match.substring(1));
};

/**
 * Component to render text with highlighted mentions
 */
interface MentionTextProps {
  text: string;
  onMentionClick?: (username: string) => void;
  className?: string;
}

export const MentionText: React.FC<MentionTextProps> = ({ text, onMentionClick, className = "" }) => {
  const parts = text.split(/(@\w+)/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const username = part.substring(1);
          return (
            <span
              key={i}
              onClick={() => onMentionClick?.(username)}
              className={`text-orion-blue font-bold hover:underline cursor-pointer transition-all`}
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

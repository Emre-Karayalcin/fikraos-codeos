import type { ComponentProps } from 'react';

export const UserIcon = (props: ComponentProps<'svg'>) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M1.34796 17.4842C1.34796 14.4207 3.83143 11.9372 6.89495 11.9372H13.1051C16.1686 11.9372 18.652 14.4207 18.652 17.4842C18.652 18.5054 17.8242 19.3332 16.803 19.3332H3.19696C2.17578 19.3332 1.34796 18.5054 1.34796 17.4842Z"
      fill="currentColor"
      fillOpacity="0.5"
    />
    <path
      d="M10.0033 10.528C12.7264 10.528 14.934 8.32047 14.934 5.59734C14.934 2.87422 12.7264 0.666687 10.0033 0.666687C7.28018 0.666687 5.07265 2.87422 5.07265 5.59734C5.07265 8.32047 7.28018 10.528 10.0033 10.528Z"
      fill="currentColor"
      fillOpacity="0.5"
    />
  </svg>
);

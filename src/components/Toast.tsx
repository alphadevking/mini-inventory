import React from 'react';
import { notifications } from '@mantine/notifications';
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';

interface ToastOptions {
  title?: string;
  message: string;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const useToast = () => {
  const toast = {
    success: (options: ToastOptions) => {
      notifications.show({
        title: options.title,
        message: options.message,
        color: 'green',
        icon: <CheckCircle size={20} />,
        autoClose: options.duration || 4000,
        position: options.position || 'top-right'
      });
    },
    error: (options: ToastOptions) => {
      notifications.show({
        title: options.title,
        message: options.message,
        color: 'red',
        icon: <XCircle size={20} />,
        autoClose: options.duration || 4000,
        position: options.position || 'top-right'
      });
    },
    warning: (options: ToastOptions) => {
      notifications.show({
        title: options.title,
        message: options.message,
        color: 'yellow',
        icon: <AlertCircle size={20} />,
        autoClose: options.duration || 4000,
        position: options.position || 'top-right'
      });
    },
    info: (options: ToastOptions) => {
      notifications.show({
        title: options.title,
        message: options.message,
        color: 'blue',
        icon: <Info size={20} />,
        autoClose: options.duration || 4000,
        position: options.position || 'top-right'
      });
    }
  };

  return toast;
};

// Also export a simple toast object for non-hook usage if needed, 
// though Mantine's notifications object already serves this purpose.
export const toast = {
  success: (message: string, title?: string) => notifications.show({ message, title, color: 'green', icon: <CheckCircle size={20} /> }),
  error: (message: string, title?: string) => notifications.show({ message, title, color: 'red', icon: <XCircle size={20} /> }),
  warning: (message: string, title?: string) => notifications.show({ message, title, color: 'yellow', icon: <AlertCircle size={20} /> }),
  info: (message: string, title?: string) => notifications.show({ message, title, color: 'blue', icon: <Info size={20} /> }),
};

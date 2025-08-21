"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AuthModal } from "@/components/auth/auth-modal";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showAuthModal?: boolean;
  onAuthRequired?: () => void;
}

export function AuthGuard({
  children,
  fallback,
  showAuthModal = true,
  onAuthRequired,
}: AuthGuardProps) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (user) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showAuthModal) {
    return (
      <AuthModal defaultTab="signin">
        <div onClick={() => setShowModal(true)}>{children}</div>
      </AuthModal>
    );
  }

  return <>{children}</>;
}

// Higher-order component for protecting actions
export function withAuth<T extends object>(
  Component: React.ComponentType<T>,
  options: {
    showAuthModal?: boolean;
    fallback?: React.ReactNode;
  } = {}
) {
  return function AuthenticatedComponent(props: T) {
    const { user } = useAuth();
    const [showModal, setShowModal] = useState(false);

    if (user) {
      return <Component {...props} />;
    }

    if (options.fallback) {
      return <>{options.fallback}</>;
    }

    if (options.showAuthModal) {
      return (
        <AuthModal defaultTab="signin">
          <div onClick={() => setShowModal(true)}>
            <Component {...props} />
          </div>
        </AuthModal>
      );
    }

    return <Component {...props} />;
  };
}

// Hook for protecting actions
export function useAuthGuard() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const requireAuth = (action: () => void, showModalOnFail = true) => {
    if (user) {
      action();
    } else if (showModalOnFail) {
      setShowModal(true);
    }
  };

  const AuthModalWrapper = ({ children }: { children: React.ReactNode }) => {
    if (!showModal) return null;

    return (
      <AuthModal defaultTab="signin">
        <div onClick={() => setShowModal(false)}>{children}</div>
      </AuthModal>
    );
  };

  return {
    user,
    requireAuth,
    AuthModalWrapper,
    showModal,
    setShowModal,
  };
}

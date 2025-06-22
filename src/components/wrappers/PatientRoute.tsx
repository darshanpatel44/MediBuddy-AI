import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { ReactNode, useEffect } from "react";
import { Navigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import { LoadingSpinner } from "../loading-spinner";

interface PatientRouteProps {
  children: ReactNode;
}

export default function PatientRoute({ children }: PatientRouteProps) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);

  const userData = useQuery(
    api.users.getUserByToken,
    isUserLoaded && user?.id ? { tokenIdentifier: user.id } : "skip"
  );

  // Create user in Convex if they don't exist yet
  useEffect(() => {
    const createUserIfNeeded = async () => {
      if (isUserLoaded && user?.id && userData === null) {
        try {
          // User exists in Clerk but not in Convex, create them
          await createOrUpdateUser({});
        } catch (error) {
          console.error("Error creating user:", error);
        }
      }
    };

    createUserIfNeeded();
  }, [isUserLoaded, user, userData, createOrUpdateUser]);

  if (!isUserLoaded) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (userData === undefined) {
    return <LoadingSpinner />;
  }

  if (userData === null) {
    return <Navigate to="/role-selection" replace />;
  }

  if (userData.role !== "patient") {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

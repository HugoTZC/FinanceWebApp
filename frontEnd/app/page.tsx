"use client"

import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authAPI } from "@/lib/api";
import Loading from "@/components/ui/loading";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we have a token in localStorage
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/auth/login");
          return;
        }

        // Verify token with backend
        const response = await authAPI.getProfile();
        if (response?.data) {
          setIsAuthenticated(true);
        } else {
          router.push("/auth/login");
        }
      } catch (error) {
        console.error("Authentication verification failed:", error);
        router.push("/auth/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return null; // Router.push will handle redirect
  }

  return <DashboardPage />;
}


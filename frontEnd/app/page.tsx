"use client"

import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authAPI } from "@/lib/api";
import Loading from "@/components/ui/loading";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authAPI.getProfile();
        if (!response?.data) {
          router.push("/auth/login");
        }
      } catch (error) {
        console.error("Authentication verification failed:", error);
        router.push("/auth/login");
      }
    };
  
    checkAuth();
  }, [router]);

  // Return loading state initially
  const isServerSide = typeof window === "undefined";
  const hasToken = !isServerSide && localStorage.getItem("token");
  
  if (!hasToken) {
    router.push("/auth/login");
    return null;
  }

  return <DashboardPage />;
}


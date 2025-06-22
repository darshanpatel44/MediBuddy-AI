import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { SignInButton, useUser } from "@clerk/clerk-react";
import {
  Authenticated,
  Unauthenticated,
  useQuery,
  useMutation,
} from "convex/react";
import { ArrowRight, Star } from "lucide-react";
import { useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import React from "react";

function DashboardButton({
  variant = "primary",
}: {
  variant?: "primary" | "secondary";
}) {
  const { user } = useUser();
  const navigate = useNavigate();
  const userData = useQuery(
    api.users.getUserByToken,
    user?.id ? { tokenIdentifier: user.id } : "skip"
  );
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);

  // Ensure user exists in Convex database
  React.useEffect(() => {
    const createUserIfNeeded = async () => {
      if (user?.id && userData === null) {
        try {
          // User exists in Clerk but not in Convex, create them
          await createOrUpdateUser({});
          navigate("/role-selection");
        } catch (error) {
          console.error("Error creating user:", error);
        }
      }
    };

    createUserIfNeeded();
  }, [user, userData, createOrUpdateUser, navigate]);

  const handleClick = () => {
    if (!userData) {
      // User not in database yet
      createOrUpdateUser({})
        .then(() => {
          navigate("/role-selection");
        })
        .catch((error) => {
          console.error("Error creating user:", error);
        });
    } else if (userData.role === "doctor") {
      navigate("/doctor/dashboard");
    } else if (userData.role === "patient") {
      navigate("/patient/dashboard");
    } else {
      // User exists but doesn't have a role
      navigate("/role-selection");
    }
  };

  const buttonClass =
    variant === "primary"
      ? "h-12 px-8 text-base rounded-[14px] bg-[#0066CC] hover:bg-[#0077ED] text-white shadow-sm transition-all"
      : "h-12 px-8 text-base rounded-[14px] bg-white text-[#0066CC] hover:bg-white/90 transition-all";

  return (
    <Button onClick={handleClick} className={buttonClass}>
      Go to Dashboard
    </Button>
  );
}

const FEATURES = [
  {
    icon: "🎙️",
    title: "Real-time Transcription",
    description:
      "AI-powered audio recording with instant transcription using Whisper API",
  },
  {
    icon: "🧠",
    title: "Medical Entity Extraction",
    description:
      "Intelligent extraction of conditions, medications, and allergies from conversations",
  },
  {
    icon: "🔍",
    title: "Smart Trial Matching",
    description:
      "Automated algorithm that ranks clinical trials by patient relevance",
  },
  {
    icon: "🔒",
    title: "HIPAA Compliant",
    description: "Privacy-first design with secure agent-based communication",
  },
] as const;

function App() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const navigate = useNavigate();
  const userData = useQuery(
    api.users.getUserByToken,
    isUserLoaded && user?.id ? { tokenIdentifier: user.id } : "skip"
  );
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);

  // Auto-redirect to role selection for users without a role
  React.useEffect(() => {
    const handleRedirection = async () => {
      if (isUserLoaded && user?.id) {
        if (userData === null) {
          // Create the user and redirect to role selection
          try {
            await createOrUpdateUser({});
            navigate("/role-selection");
          } catch (error) {
            console.error("Error creating user:", error);
          }
        } else if (userData && !userData.role) {
          // User exists but has no role, redirect to role selection
          navigate("/role-selection");
        }
      }
    };

    handleRedirection();
  }, [isUserLoaded, user, userData, createOrUpdateUser, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
      <Navbar />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-24">
          {/* Hero Section */}
          <div className="relative flex flex-col items-center text-center space-y-6 pb-24">
            <div className="absolute inset-x-0 -top-24 -bottom-24 bg-gradient-to-b from-[#FBFBFD] via-white to-[#FBFBFD] opacity-80 blur-3xl -z-10" />
            <div className="inline-flex items-center gap-2 rounded-[20px] bg-[#0066CC]/10 px-4 py-2">
              {/* <Star className="h-4 w-4 text-[#0066CC]" /> */}
              <span className="text-sm font-medium text-[#0066CC]">
                Empowering Doctors, Guiding Patients.
              </span>
            </div>
            <div className="flex flex-col items-center space-y-6">
              <Logo size={80} className="drop-shadow-lg" />
              <h1 className="text-6xl font-semibold text-[#1D1D1F] tracking-tight max-w-[800px] leading-[1.1]">
                MediBuddy AI
              </h1>
            </div>
            <p className="text-xl text-[#86868B] max-w-[600px] leading-relaxed">
              Automate clinical trial matching by transcribing doctor-patient
              conversations, extracting medical data, and connecting patients
              with relevant trials in real-time.
            </p>

            {!isUserLoaded ? (
              <div className="flex gap-4 pt-4">
                <div className="h-12 px-8 w-[145px] rounded-[14px] bg-gray-200 animate-pulse"></div>
              </div>
            ) : (
              <div className="flex items-center gap-5 pt-4">
                <Unauthenticated>
                  <SignInButton mode="modal">
                    <Button className="h-12 px-8 text-base rounded-[14px] bg-[#0066CC] hover:bg-[#0077ED] text-white shadow-sm transition-all">
                      Get Started
                    </Button>
                  </SignInButton>
                </Unauthenticated>
                <Authenticated>
                  <DashboardButton />
                </Authenticated>
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 py-24">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-[20px] bg-white p-6 transition-all hover:scale-[1.02] hover:shadow-lg"
              >
                <div className="text-2xl mb-4 transform-gpu transition-transform group-hover:scale-110">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">
                  {feature.title}
                </h3>
                <p className="text-base text-[#86868B] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;

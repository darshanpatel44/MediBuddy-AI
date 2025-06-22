import { useMutation } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stethoscope, User, ArrowRight } from "lucide-react";

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<"doctor" | "patient" | null>(
    null
  );
  const [specialization, setSpecialization] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const updateUserRole = useMutation(api.users.updateUserRole);
  const navigate = useNavigate();

  const handleRoleSubmit = async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    try {
      const updateData: any = { role: selectedRole };

      if (selectedRole === "doctor") {
        if (specialization) updateData.specialization = specialization;
        if (licenseNumber) updateData.licenseNumber = licenseNumber;
      } else if (selectedRole === "patient") {
        if (gender) updateData.gender = gender;
        if (age) updateData.age = parseInt(age);
        if (location) updateData.location = location;
      }

      await updateUserRole(updateData);

      // Navigate to appropriate dashboard
      if (selectedRole === "doctor") {
        navigate("/doctor/dashboard");
      } else {
        navigate("/patient/dashboard");
      }
    } catch (error) {
      console.error("Error updating role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
      <Navbar />
      <main className="flex-grow flex items-center justify-center py-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <Logo size={64} className="drop-shadow-lg" />
            </div>
            <h1 className="text-3xl font-semibold text-[#1D1D1F] mb-4">
              Welcome to MediBuddy AI
            </h1>
            <p className="text-lg text-[#86868B] mb-4">
              Please select your role to get started with the platform.
            </p>
            <div className="bg-blue-50 text-blue-700 p-4 rounded-lg text-left mb-6">
              <p className="text-base mb-2 font-medium">
                One more step to complete your registration
              </p>
              <p className="text-sm">
                Before you can use MediBuddy, please select whether you're a
                doctor or a patient. This will personalize your experience and
                ensure you get the right features for your needs.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedRole === "doctor"
                  ? "ring-2 ring-[#0066CC] bg-[#0066CC]/5"
                  : ""
              }`}
              onClick={() => setSelectedRole("doctor")}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-[#0066CC]/10">
                  <Stethoscope className="h-8 w-8 text-[#0066CC]" />
                </div>
                <CardTitle>I'm a Doctor</CardTitle>
                <CardDescription>
                  Access patient consultation tools, transcription features, and
                  clinical trial matching
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedRole === "patient"
                  ? "ring-2 ring-[#0066CC] bg-[#0066CC]/5"
                  : ""
              }`}
              onClick={() => setSelectedRole("patient")}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-[#0066CC]/10">
                  <User className="h-8 w-8 text-[#0066CC]" />
                </div>
                <CardTitle>I'm a Patient</CardTitle>
                <CardDescription>
                  View your medical information, receive trial notifications,
                  and manage consent
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {selectedRole && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  {selectedRole === "doctor"
                    ? "Doctor Information"
                    : "Patient Information"}
                </CardTitle>
                <CardDescription>
                  Please provide additional information to complete your
                  profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedRole === "doctor" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="specialization">Specialization</Label>
                      <Select
                        value={specialization}
                        onValueChange={setSpecialization}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your specialization" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cardiology">Cardiology</SelectItem>
                          <SelectItem value="oncology">Oncology</SelectItem>
                          <SelectItem value="neurology">Neurology</SelectItem>
                          <SelectItem value="pediatrics">Pediatrics</SelectItem>
                          <SelectItem value="psychiatry">Psychiatry</SelectItem>
                          <SelectItem value="dermatology">
                            Dermatology
                          </SelectItem>
                          <SelectItem value="orthopedics">
                            Orthopedics
                          </SelectItem>
                          <SelectItem value="gastroenterology">
                            Gastroenterology
                          </SelectItem>
                          <SelectItem value="endocrinology">
                            Endocrinology
                          </SelectItem>
                          <SelectItem value="pulmonology">
                            Pulmonology
                          </SelectItem>
                          <SelectItem value="rheumatology">
                            Rheumatology
                          </SelectItem>
                          <SelectItem value="nephrology">Nephrology</SelectItem>
                          <SelectItem value="hematology">Hematology</SelectItem>
                          <SelectItem value="infectious-disease">
                            Infectious Disease
                          </SelectItem>
                          <SelectItem value="emergency-medicine">
                            Emergency Medicine
                          </SelectItem>
                          <SelectItem value="family-medicine">
                            Family Medicine
                          </SelectItem>
                          <SelectItem value="internal-medicine">
                            Internal Medicine
                          </SelectItem>
                          <SelectItem value="general-surgery">
                            General Surgery
                          </SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="license">Medical License Number</Label>
                      <Input
                        id="license"
                        placeholder="Your medical license number"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {selectedRole === "patient" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Sex/Gender</Label>
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your sex/gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="non-binary">Non-binary</SelectItem>
                          <SelectItem value="prefer-not-to-say">
                            Prefer not to say
                          </SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        placeholder="Enter your age"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        min="1"
                        max="120"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        placeholder="City, State/Province, Country"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <div className="text-center">
            <Button
              onClick={handleRoleSubmit}
              disabled={!selectedRole || isLoading}
              className="h-12 px-8 text-base rounded-[14px] bg-[#0066CC] hover:bg-[#0077ED] text-white"
            >
              {isLoading ? (
                "Setting up your account..."
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

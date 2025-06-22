import { Suspense, useEffect } from "react";
import { Route, Routes, useRoutes } from "react-router-dom";
import { useConvex } from "convex/react";
import Dashboard from "./pages/dashboard";
import Home from "./pages/home";
import RoleSelection from "./pages/role-selection";
import DoctorDashboard from "./pages/doctor/dashboard";
import DoctorConsultation from "./pages/doctor/consultation";
import DoctorTrialMatching from "./pages/doctor/trial-matching";
import PatientDashboard from "./pages/patient/dashboard";
import PatientNotifications from "./pages/patient/notifications";
import PatientAppointments from "./pages/patient/appointments";
import PatientReports from "./pages/patient/reports";
import PatientConsultation from "./pages/patient/consultation";
import PatientConsent from "./pages/patient/consent";
import PatientActiveTrials from "./pages/patient/active-trials";
import PatientMedicalProfile from "./pages/patient/medical-profile";
import DoctorRoute from "./components/wrappers/DoctorRoute";
import PatientRoute from "./components/wrappers/PatientRoute";
import ProtectedRoute from "./components/wrappers/ProtectedRoute";
import { initializeAgentSystem } from "./agents";

function App() {
  // Get the Convex client
  const convex = useConvex();

  // Initialize the agent system when the app starts
  useEffect(() => {
    // Initialize the agent system with the Convex client
    const cleanup = initializeAgentSystem(convex);

    // Clean up when the component unmounts
    return cleanup;
  }, [convex]);

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/role-selection" element={<RoleSelection />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Doctor Routes */}
          <Route
            path="/doctor/dashboard"
            element={
              <DoctorRoute>
                <DoctorDashboard />
              </DoctorRoute>
            }
          />
          <Route
            path="/doctor/consultation"
            element={
              <DoctorRoute>
                <DoctorConsultation />
              </DoctorRoute>
            }
          />
          <Route
            path="/doctor/consultation/:consultationId"
            element={
              <DoctorRoute>
                <DoctorConsultation />
              </DoctorRoute>
            }
          />
          <Route
            path="/doctor/trial-matching"
            element={
              <DoctorRoute>
                <DoctorTrialMatching />
              </DoctorRoute>
            }
          />

          {/* Patient Routes */}
          <Route
            path="/patient/dashboard"
            element={
              <PatientRoute>
                <PatientDashboard />
              </PatientRoute>
            }
          />
          <Route
            path="/patient/notifications"
            element={
              <PatientRoute>
                <PatientNotifications />
              </PatientRoute>
            }
          />
          <Route
            path="/patient/appointments"
            element={
              <PatientRoute>
                <PatientAppointments />
              </PatientRoute>
            }
          />
          <Route
            path="/patient/reports"
            element={
              <PatientRoute>
                <PatientReports />
              </PatientRoute>
            }
          />
          <Route
            path="/patient/consent"
            element={
              <PatientRoute>
                <PatientConsent />
              </PatientRoute>
            }
          />
          <Route
            path="/patient/active-trials"
            element={
              <PatientRoute>
                <PatientActiveTrials />
              </PatientRoute>
            }
          />
          <Route
            path="/patient/medical-profile"
            element={
              <PatientRoute>
                <PatientMedicalProfile />
              </PatientRoute>
            }
          />
          <Route
            path="/patient/consultation/:consultationId"
            element={
              <PatientRoute>
                <PatientConsultation />
              </PatientRoute>
            }
          />

          {/* Unauthorized route */}
          <Route
            path="/unauthorized"
            element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-red-600 mb-4">
                    Unauthorized Access
                  </h1>
                  <p className="text-gray-600">
                    You don't have permission to access this page.
                  </p>
                </div>
              </div>
            }
          />
        </Routes>
        {useRoutes(routes)}
      </>
    </Suspense>
  );
}

export default App;

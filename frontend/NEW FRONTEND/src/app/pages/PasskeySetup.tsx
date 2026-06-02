import { useState } from "react";
import { useNavigate } from "react-router";
import { Sidebar } from "../components/Sidebar";
import { toast } from "sonner";
import { Fingerprint, Smartphone, Shield, Check } from "lucide-react";

export function PasskeySetup() {
  const [step, setStep] = useState<"intro" | "creating" | "success">("intro");
  const navigate = useNavigate();

  const handleCreatePasskey = async () => {
    setStep("creating");

    setTimeout(() => {
      setStep("success");
      toast.success("Passkey created successfully!");
    }, 2000);
  };

  const handleComplete = () => {
    navigate("/dashboard/settings");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          {step === "intro" && (
            <div className="bg-card rounded-lg shadow-lg p-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Fingerprint className="text-primary" size={32} />
                </div>
              </div>

              <h1 className="text-center mb-4">Setup Passkey Authentication</h1>
              <p className="text-center text-muted-foreground mb-8">
                Enhance your account security with device passkey authentication.
                Use your fingerprint, face ID, or device PIN to login securely.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 p-4 bg-secondary/50 rounded-lg">
                  <Shield className="text-primary flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="mb-1">Enhanced Security</h3>
                    <p className="text-sm text-muted-foreground">
                      Passkeys are more secure than passwords and cannot be phished or stolen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-secondary/50 rounded-lg">
                  <Smartphone className="text-primary flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="mb-1">Device-Based Authentication</h3>
                    <p className="text-sm text-muted-foreground">
                      Your passkey is stored securely on your device and never leaves it.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-secondary/50 rounded-lg">
                  <Check className="text-primary flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="mb-1">Quick & Convenient</h3>
                    <p className="text-sm text-muted-foreground">
                      Login instantly with your fingerprint or face ID - no password needed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleCreatePasskey}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Create Passkey
                </button>
                <button
                  onClick={() => navigate("/dashboard/settings")}
                  className="w-full border border-border py-3 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          )}

          {step === "creating" && (
            <div className="bg-card rounded-lg shadow-lg p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                  <Fingerprint className="text-primary" size={32} />
                </div>
              </div>

              <h2 className="mb-4">Creating Your Passkey</h2>
              <p className="text-muted-foreground mb-8">
                Please use your device's biometric sensor or PIN to authenticate...
              </p>

              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="bg-card rounded-lg shadow-lg p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <Check className="text-green-600 dark:text-green-400" size={32} />
                </div>
              </div>

              <h2 className="mb-4">Passkey Created Successfully!</h2>
              <p className="text-muted-foreground mb-8">
                Your device passkey has been registered. You can now use it to login securely.
              </p>

              <div className="bg-secondary/50 rounded-lg p-4 mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Device Name</span>
                  <span className="text-sm font-medium">
                    {navigator.userAgent.includes("Mac") ? "MacBook Pro" :
                     navigator.userAgent.includes("Windows") ? "Windows PC" : "Device"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Created</span>
                  <span className="text-sm font-medium">{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <button
                onClick={handleComplete}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

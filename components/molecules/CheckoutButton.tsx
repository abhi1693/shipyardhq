"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/atoms/button";
import { initDodoCheckout, openDodoCheckout } from "@/lib/dodoCheckout";

type Props = {
  productId: string;
  email?: string;
  name?: string;
  label?: string;
  className?: string;
  redirectUrl?: string;
  redirectPath?: string;
  disabled?: boolean;
};

export function CheckoutButton({
  productId,
  email,
  name,
  label = "Checkout Now",
  className,
  redirectUrl,
  redirectPath,
  disabled,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initDodoCheckout({
      theme: "light",
      onEvent: (event) => {
        const type = (event as any)?.event_type;
        switch (type) {
          case "checkout.opened": {
            // Overlay opened; ensure UI reflects ready state
            setIsLoading(false);
            break;
          }
          case "checkout.closed": {
            // Overlay closed; stop any loading spinners
            setIsLoading(false);
            break;
          }
          case "checkout.redirect": {
            // Checkout will redirect; show loading until navigation completes
            setIsLoading(true);
            break;
          }
          case "checkout.error": {
            // An error occurred; surface and stop loading
            try {
              console.error("Dodo checkout error:", (event as any)?.message || event);
            } catch {}
            setIsLoading(false);
            break;
          }
          default: {
            // Unknown/extra event types; keep UI stable
            break;
          }
        }
      },
    });
  }, []);

  const handleCheckout = async () => {
    try {
      setIsLoading(true);
      const finalRedirectUrl = redirectUrl ?? `${window.location.origin}${redirectPath ?? "/member/organizations"}`;
      await openDodoCheckout({
        products: [{ productId }],
        redirectUrl: finalRedirectUrl,
        email,
        name,
      });
    } catch (err) {
      console.error("Failed to open checkout:", err);
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleCheckout} disabled={disabled || isLoading} className={className}>
      {isLoading ? "Loading..." : label}
    </Button>
  );
}

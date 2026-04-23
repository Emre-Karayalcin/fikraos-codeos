import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export interface ChallengeOption {
  id: string;
  title: string;
  description?: string | null;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBuildWithAI: (challengeId?: string) => void;
  onManualSubmit: (payload: {
    ideaName: string;
    ideaDescription: string;
    country: string;
    uniqueness: string;
    challengeId?: string;
  }) => Promise<void>;
  /** Active challenges for the org. If non-empty, sector selection is shown first. */
  challenges?: ChallengeOption[];
  /** Pre-selected challengeId (e.g., when opened from a challenge detail page). Skips sector step. */
  preselectedChallengeId?: string;
};

const ALL_COUNTRIES: { code: string; name: string }[] = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "CV", name: "Cabo Verde" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "CD", name: "Democratic Republic of the Congo" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "SZ", name: "Eswatini" },
  { code: "ET", name: "Ethiopia" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "The Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "GD", name: "Grenada" },
  { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "XK", name: "Kosovo" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "KP", name: "North Korea" },
  { code: "MK", name: "North Macedonia" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PS", name: "Palestine" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "Sao Tome and Principe" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "KR", name: "South Korea" },
  { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VA", name: "Vatican City" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" }
];

export default function NewChatModal({
  open,
  onOpenChange,
  onBuildWithAI,
  onManualSubmit,
  challenges = [],
  preselectedChallengeId,
}: Props) {
  const { t } = useTranslation();

  // Whether to show the sector selection screen first
  const needsSectorStep = challenges.length > 0 && !preselectedChallengeId;

  const [inSectorStep, setInSectorStep] = useState(needsSectorStep);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>(preselectedChallengeId ?? "");

  const [step, setStep] = useState<number>(0);
  const [ideaDescription, setIdeaDescription] = useState("");
  const [country, setCountry] = useState("SA");
  const [uniqueness, setUniqueness] = useState("");
  const [ideaName, setIdeaName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setInSectorStep(needsSectorStep);
    setSelectedChallengeId(preselectedChallengeId ?? "");
    setStep(0);
    setIdeaDescription("");
    setCountry("SA");
    setUniqueness("");
    setIdeaName("");
    setSubmitting(false);
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const confirmSector = () => {
    if (!selectedChallengeId) return;
    setInSectorStep(false);
  };

  const startManual = () => setStep(1);
  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => {
    if (step === 1) {
      setStep(0);
      return;
    }
    if (step === 0 && needsSectorStep) {
      setInSectorStep(true);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const handleManualFinish = async () => {
    setSubmitting(true);
    try {
      await onManualSubmit({
        ideaName: ideaName.trim(),
        ideaDescription: ideaDescription.trim(),
        country,
        uniqueness: uniqueness.trim(),
        challengeId: selectedChallengeId || undefined,
      });
      close();
    } catch (e) {
      setSubmitting(false);
      throw e;
    }
  };

  const stepImage = (s: number) => {
    const base = "https://app.fikrahub.com/images/education";
    switch (s) {
      case 1: return `${base}/step-idea-1.png`;
      case 2: return `${base}/step-idea-2.png`;
      case 3: return `${base}/step-idea-3.png`;
      case 4: return `${base}/step-idea-4.png`;
      default: return `${base}/step-choose-1.png`;
    }
  };

  const renderProgress = () => {
    if (inSectorStep || step === 0) return null;
    return (
      <div className="w-full flex items-center justify-center mb-4 relative">
        <div className="absolute left-4">
          <button onClick={back} aria-label="Back" className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={`w-3 h-3 rounded-full ${n === step ? 'bg-orange-500' : 'bg-gray-300'}`}
            />
          ))}
        </div>
      </div>
    );
  };

  const selectedChallenge = challenges.find(c => c.id === selectedChallengeId);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl w-full">
        <DialogHeader className="pb-0">
          <DialogTitle className="sr-only">{t('newChat.title') ?? 'Create conversation'}</DialogTitle>
        </DialogHeader>

        {renderProgress()}

        {/* ── Sector selection step ── */}
        {inSectorStep && (
          <div className="space-y-5">
            <div className="text-center">
              <h3 className="text-xl font-semibold">Choose a Sector</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Select the sector your idea belongs to. Ideas must be created within a sector.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {challenges.map((c) => {
                const isSelected = selectedChallengeId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChallengeId(c.id)}
                    className={`text-left rounded-xl border-2 p-4 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm">{c.title}</div>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                    </div>
                    {c.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={close}>Cancel</Button>
              <Button onClick={confirmSector} disabled={!selectedChallengeId}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* ── Choose AI or Manual ── */}
        {!inSectorStep && step === 0 && (
          <div className="space-y-6">
            {selectedChallenge && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-primary font-medium">Sector: {selectedChallenge.title}</span>
                {needsSectorStep && (
                  <button
                    onClick={() => setInSectorStep(true)}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Change
                  </button>
                )}
              </div>
            )}

            <div className="text-center">
              <h3 className="text-xl font-semibold">{t('newChat.title') ?? 'Create conversation'}</h3>
              <p className="text-sm text-muted-foreground mt-2">{t('newChat.choose') ?? 'Choose how to build your conversation'}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Button onClick={() => { onBuildWithAI(selectedChallengeId || undefined); onOpenChange(false); }} className="w-full py-4">
                {t('newChat.buildWithAI') ?? 'Build with AI'}
              </Button>
              <Button variant="outline" onClick={startManual} className="w-full py-4">
                {t('newChat.buildManual') ?? 'Build manually'}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              {t('newChat.note') ?? 'Build with AI creates project + chat automatically.'}
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" onClick={close}>{t('common.cancel') ?? 'Cancel'}</Button>
            </div>
          </div>
        )}

        {/* ── Manual steps 1–4 ── */}
        {!inSectorStep && step === 1 && (
          <div className="space-y-6 text-center">
            <img src={stepImage(1)} alt="" className="mx-auto max-h-44 object-contain" />
            <h3 className="text-lg font-semibold">{t('manual.step1.title') ?? 'What is your idea? Explain it comprehensively.'}</h3>
            <div>
              <Textarea
                value={ideaDescription}
                onChange={(e) => setIdeaDescription(e.target.value)}
                rows={3}
                className="max-w-2xl mx-auto"
                placeholder={t('manual.step1.placeholder') ?? ''}
              />
            </div>
            <div className="max-w-2xl mx-auto space-y-3">
              <Button onClick={next} className="w-full py-3" disabled={!ideaDescription.trim()}>
                {t('common.next') ?? 'Next'}
              </Button>
            </div>
          </div>
        )}

        {!inSectorStep && step === 2 && (
          <div className="space-y-6 text-center">
            <img src={stepImage(2)} alt="" className="mx-auto max-h-44 object-contain" />
            <h3 className="text-lg font-semibold">{t('manual.step2.title') ?? 'Where are you launching your idea?'}</h3>
            <div className="max-w-2xl mx-auto">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-transparent rounded-lg border px-4 py-3 text-left"
                aria-label={t('manual.step2.title') ?? 'Country'}
              >
                {ALL_COUNTRIES.map((c) => (
                  <option value={c.code} key={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="max-w-2xl mx-auto space-y-3">
              <Button onClick={next} className="w-full py-3">
                {t('common.next') ?? 'Next'}
              </Button>
            </div>
          </div>
        )}

        {!inSectorStep && step === 3 && (
          <div className="space-y-6 text-center">
            <img src={stepImage(3)} alt="" className="mx-auto max-h-44 object-contain" />
            <h3 className="text-lg font-semibold">{t('manual.step3.title') ?? 'What makes your idea unique?'}</h3>
            <div className="max-w-2xl mx-auto">
              <Input value={uniqueness} onChange={(e) => setUniqueness(e.target.value)} placeholder={t('manual.step3.placeholder') ?? ''} />
            </div>
            <div className="max-w-2xl mx-auto space-y-3">
              <Button onClick={next} className="w-full py-3" disabled={!uniqueness.trim()}>
                {t('common.next') ?? 'Next'}
              </Button>
            </div>
          </div>
        )}

        {!inSectorStep && step === 4 && (
          <div className="space-y-6 text-center">
            <img src={stepImage(4)} alt="" className="mx-auto max-h-44 object-contain" />
            <h3 className="text-lg font-semibold">{t('manual.step5.title') ?? "What's your idea name?"}</h3>
            <div className="max-w-2xl mx-auto">
              <Input value={ideaName} onChange={(e) => setIdeaName(e.target.value)} placeholder={t('manual.step4.placeholder') ?? ''} />
            </div>
            <div className="max-w-2xl mx-auto space-y-3">
              <Button onClick={handleManualFinish} className="w-full py-3" disabled={submitting || !ideaName.trim()}>
                {submitting ? (t('common.saving') ?? 'Saving...') : (t('common.submit') ?? 'Submit')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

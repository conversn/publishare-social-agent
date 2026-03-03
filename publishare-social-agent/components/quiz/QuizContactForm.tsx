import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { completeQuizSession, getQuizSessionId, createQuizSession } from "@/utils/quizManager";
import { supabase } from "@/integrations/supabase/client";
import { findOrCreateContact, logContactInteraction } from "@/utils/contact";
import { getCurrentUtmSessionId } from "@/utils/utmTracking";

interface QuizContactFormProps {
  answers: Record<string, string>;
  onSubmissionComplete: () => void;
  onBack: () => void;
}

interface ContactQuestion {
  id: string;
  title: string;
  subtitle?: string;
  type: "input" | "consent";
  inputConfig?: {
    placeholder: string;
    type: string;
    required: boolean;
  };
}

const contactQuestions: ContactQuestion[] = [
  {
    id: "firstName",
    title: "What's your first name?",
    subtitle: "We'll use this to personalize your retirement strategy",
    type: "input",
    inputConfig: {
      placeholder: "First Name",
      type: "text",
      required: true
    }
  },
  {
    id: "lastName",
    title: "What's your last name?",
    type: "input",
    inputConfig: {
      placeholder: "Last Name",
      type: "text",
      required: true
    }
  },
  {
    id: "email",
    title: "What's your email address?",
    subtitle: "We'll send your personalized retirement strategy here",
    type: "input",
    inputConfig: {
      placeholder: "Email Address",
      type: "email",
      required: true
    }
  },
  {
    id: "phone",
    title: "What's your phone number?",
    subtitle: "Our advisor may call to discuss your strategy",
    type: "input",
    inputConfig: {
      placeholder: "Phone Number",
      type: "tel",
      required: true
    }
  },
  {
    id: "consent",
    title: "Communication consent",
    subtitle: "We need your permission to provide you with personalized recommendations",
    type: "consent"
  }
];

const QuizContactForm = ({ answers, onSubmissionComplete, onBack }: QuizContactFormProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    consent: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progress = ((currentQuestion + 1) / contactQuestions.length) * 100;

  const handleInputChange = (value: string) => {
    const currentQuestionId = contactQuestions[currentQuestion].id;
    setFormData({
      ...formData,
      [currentQuestionId]: value
    });
  };

  const handleConsentChange = (checked: boolean) => {
    setFormData({
      ...formData,
      consent: checked
    });
  };

  const handleNext = () => {
    const currentQuestionData = contactQuestions[currentQuestion];
    const currentValue = formData[currentQuestionData.id as keyof typeof formData];
    
    if (currentQuestionData.type === "input" && currentQuestionData.inputConfig?.required && !currentValue) {
      toast.error("Please fill in this field before continuing.");
      return;
    }

    if (currentQuestionData.type === "consent" && !formData.consent) {
      toast.error("Please agree to the consent terms before continuing.");
      return;
    }

    if (currentQuestion < contactQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else {
      onBack();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const contactData = {
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
      };

      console.log('Submitting quiz contact form:', contactData);

      // Get or create quiz session with contact data
      let sessionId = getQuizSessionId('retirement_quiz');
      if (!sessionId) {
        sessionId = await createQuizSession('retirement_quiz', contactData);
      }

      if (sessionId) {
        // Complete the quiz session with contact data
        await completeQuizSession(sessionId, contactData);

        // Create or find the contact to get the contact ID
        const contact = await findOrCreateContact(contactData.email, contactData);
        
        if (contact) {
          console.log('Created/found contact:', contact.id);
          
          // Get current UTM session ID
          const utmSessionId = getCurrentUtmSessionId();
          
          // Save form submission with proper contact and UTM session linking
          const { error: formError } = await supabase.from('form_submissions').insert({
            contact_id: contact.id,
            utm_session_id: utmSessionId,
            form_type: 'lead_form',
            form_data: {
              ...formData,
              quiz_answers: answers,
              submission_source: 'retirement_quiz_completion',
              quiz_session_id: sessionId
            }
          });

          if (formError) {
            console.error('Error saving form submission:', formError);
          } else {
            console.log('Successfully saved form submission');
          }

          // Log form submission interaction
          await logContactInteraction(contact.id, {
            form_type: 'lead_form',
            quiz_session_id: sessionId,
            utm_session_id: utmSessionId,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      onSubmissionComplete();
      toast.success("Thank you! We'll contact you within 24 hours with your personalized retirement strategy.");
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestionData = contactQuestions[currentQuestion];
  const currentValue = formData[currentQuestionData.id as keyof typeof formData];

  return (
    <section className="py-2 px-4 sm:px-6 lg:px-8 min-h-screen flex items-start pt-4">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-2xl">📝</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Get Your Personalized Strategy</h1>
          <p className="text-blue-600 font-semibold">Almost There!</p>
          <p className="text-gray-600">Just a few more details to complete your assessment</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600">
              {currentQuestion + 1} of {contactQuestions.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                {currentQuestionData.title}
              </h2>
              {currentQuestionData.subtitle && (
                <p className="text-gray-600 mb-8 text-lg">
                  {currentQuestionData.subtitle}
                </p>
              )}

              {/* Input Questions */}
              {currentQuestionData.type === "input" && currentQuestionData.inputConfig && (
                <div className="max-w-md mx-auto mb-8">
                  <Input
                    type={currentQuestionData.inputConfig.type}
                    placeholder={currentQuestionData.inputConfig.placeholder}
                    value={currentValue as string || ""}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="h-12 text-center text-lg"
                    autoFocus
                  />
                </div>
              )}

              {/* Consent Question */}
              {currentQuestionData.type === "consent" && (
                <div className="max-w-md mx-auto mb-8">
                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg text-left">
                    <Checkbox
                      id="consent"
                      checked={formData.consent}
                      onCheckedChange={handleConsentChange}
                      className="mt-1"
                    />
                    <label
                      htmlFor="consent"
                      className="text-sm text-gray-700 leading-relaxed cursor-pointer"
                    >
                      I agree to receive communications about retirement planning strategies and understand that my information will be used to provide personalized recommendations. I can unsubscribe at any time.
                    </label>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700 text-lg font-semibold px-8 py-3"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Getting Your Results..."
                ) : currentQuestion === contactQuestions.length - 1 ? (
                  <>
                    Submit
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-gray-500 text-center mt-4">
          Your information is 100% secure and will never be shared.
        </p>
      </div>
    </section>
  );
};

export default QuizContactForm;

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageSquare, Mail, Clock, Shield } from "lucide-react";
import { EMAIL_INFO } from "@/lib/marketing-content";
import { ContentSeo } from "@/components/seo-head";

export default function DeleteData() {
  return (
    <div className="min-h-screen bg-background">
      <ContentSeo path="/delete-data" />
      <nav className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" data-testid="link-home-logo">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <MessageSquare className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold">ChatBoatAI</span>
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-4">User Data Deletion</h1>
        <p className="text-muted-foreground mb-8">
          Information about how to request deletion of your personal data.
        </p>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-primary" />
                <CardTitle>Your Privacy Rights</CardTitle>
              </div>
              <CardDescription>
                We respect your right to control your personal data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Under applicable data protection laws (including GDPR), you have the right to request 
                the deletion of your personal data. When you request data deletion, we will permanently 
                remove all information associated with your account.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Mail className="h-6 w-6 text-primary" />
                <CardTitle>How to Request Data Deletion</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                To request deletion of your account and all associated data, please send an email to:
              </p>
              <p className="text-lg font-medium">
                <a href={`mailto:${EMAIL_INFO}`} className="text-primary hover:underline" data-testid="link-privacy-email">
                  {EMAIL_INFO}
                </a>
              </p>
              <p className="text-muted-foreground">
                Please include the following information in your email:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Your registered email address</li>
                <li>Your full name as registered on the account</li>
                <li>A clear statement requesting deletion of your data</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-primary" />
                <CardTitle>What Happens Next</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Upon receiving your deletion request:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>We will verify your identity to protect your account</li>
                <li>Your request will be processed within 30 days</li>
                <li>You will receive a confirmation email once deletion is complete</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                <strong>Data that will be deleted:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Your account profile and login information</li>
                <li>All contacts, contact lists, and tags</li>
                <li>Message templates and campaigns</li>
                <li>Message history and analytics data</li>
                <li>Connected WhatsApp Business accounts</li>
                <li>All conversations and notifications</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4 p-3 bg-muted rounded-md">
                Please note: This action is irreversible. Once your data is deleted, it cannot be recovered. 
                Any active subscription will be canceled without refund for the remaining period.
              </p>
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <p className="text-muted-foreground mb-4">
              Have questions about your data or privacy?
            </p>
            <Link href="/contact">
              <Button variant="outline" data-testid="button-contact">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

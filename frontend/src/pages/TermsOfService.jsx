import React from 'react';
import {
    Box, Typography, Container, Button, Divider, useTheme,
} from '@mui/material';
import { ArrowBack, Gavel } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Section = ({ title, children }) => (
    <Box sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight={700} mb={1.5}>
            {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" lineHeight={1.9}>
            {children}
        </Typography>
    </Box>
);

export default function TermsOfService() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const accent = isDark ? '#AED6F1' : '#3AB0A9';
    const navigate = useNavigate();

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 8 }}>
            <Container maxWidth="md">
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/')}
                    sx={{ mb: 4, color: accent, fontWeight: 600 }}
                >
                    Back to Home
                </Button>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Gavel sx={{ fontSize: 36, color: accent }} />
                    <Typography variant="h4" fontWeight={900}>
                        Terms of Service
                    </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mb={4}>
                    Last updated: April 2026
                </Typography>

                <Divider sx={{ mb: 4 }} />

                <Section title="1. Acceptance of Terms">
                    By registering for or using MedViD ("the Platform"), you agree to be bound by
                    these Terms of Service. If you do not agree to these terms, you must not use the
                    Platform. These terms apply to all users, including doctors, consultants, and
                    administrators.
                </Section>

                <Section title="2. Intended Use and Clinical Disclaimer">
                    MedViD is an AI-assisted decision support tool designed to aid licensed medical
                    professionals in the analysis of gastrointestinal endoscopy videos.{'\n\n'}
                    <strong>
                        The Platform is not a substitute for professional clinical judgment.
                    </strong>{' '}
                    All AI-generated findings, classifications, confidence scores, and diagnostic
                    reports are intended as supplementary information only. Final clinical decisions
                    remain the sole responsibility of the qualified medical professional reviewing
                    the case. MedViD and its developers accept no liability for clinical outcomes
                    arising from reliance on the Platform's output.
                </Section>

                <Section title="3. Eligibility">
                    Access to MedViD is restricted to licensed and qualified medical professionals,
                    including doctors, specialists, and clinical consultants. By registering, you
                    confirm that you hold the qualifications stated in your account profile and that
                    your use of the Platform complies with all applicable laws, regulations, and
                    professional codes of conduct in your jurisdiction.
                </Section>

                <Section title="4. Account Responsibilities">
                    • You are responsible for maintaining the confidentiality of your login
                    credentials.{'\n\n'}
                    • You must not share your account with any other person.{'\n\n'}
                    • You must notify the administrator immediately if you suspect unauthorised access
                    to your account.{'\n\n'}
                    • All actions performed under your account are your responsibility.{'\n\n'}
                    • Account registration is subject to administrator approval. Access may be
                    refused or revoked at any time without prior notice.
                </Section>

                <Section title="5. Acceptable Use">
                    You agree not to:{'\n\n'}
                    • Upload patient data without the necessary consent or authorisation required
                    by applicable law.{'\n\n'}
                    • Use the Platform for any purpose other than legitimate clinical analysis and
                    review.{'\n\n'}
                    • Attempt to reverse-engineer, copy, or extract AI model outputs for
                    unauthorised use.{'\n\n'}
                    • Upload content that is unlawful, fraudulent, or unrelated to clinical
                    diagnosis.{'\n\n'}
                    • Interfere with or disrupt the integrity or performance of the Platform.
                </Section>

                <Section title="6. Patient Data and Confidentiality">
                    You are solely responsible for ensuring that any patient data uploaded to the
                    Platform complies with applicable data protection and patient confidentiality
                    laws (including but not limited to HIPAA, GDPR, or local equivalents). MedViD
                    provides the technical infrastructure; compliance with legal obligations
                    regarding patient consent and data handling is the responsibility of the
                    uploading professional.
                </Section>

                <Section title="7. Consultant Referrals">
                    When referring a case to a consultant through the Platform, you confirm that
                    you have the authority to share the relevant patient information for the purpose
                    of obtaining a specialist review. Consultants are bound by the same
                    confidentiality and professional obligations as the referring doctor.
                </Section>

                <Section title="8. Limitation of Liability">
                    To the fullest extent permitted by law, MedViD and its developers shall not be
                    liable for any direct, indirect, incidental, or consequential damages arising
                    from the use of or inability to use the Platform, including but not limited to
                    clinical decisions made on the basis of AI-generated output, data loss, or
                    service interruptions.
                </Section>

                <Section title="9. Termination">
                    Accounts may be suspended or terminated by the administrator at any time for
                    violation of these Terms, inactivity, or any other reason deemed appropriate.
                    You may request account deletion at any time by contacting the administrator.
                </Section>

                <Section title="10. Changes to These Terms">
                    These Terms may be updated at any time. Continued use of the Platform after
                    updated Terms are posted constitutes acceptance. Users will be notified of
                    material changes via email.
                </Section>

                <Section title="11. Governing Law">
                    These Terms are governed by the laws of the jurisdiction in which the Platform
                    is operated. Any disputes shall be subject to the exclusive jurisdiction of the
                    courts of that jurisdiction.
                </Section>

                <Divider sx={{ mt: 2, mb: 4 }} />
                <Typography variant="caption" color="text.secondary">
                    © {new Date().getFullYear()} MedViD — AI-Assisted GI Endoscopy Diagnostics
                </Typography>
            </Container>
        </Box>
    );
}
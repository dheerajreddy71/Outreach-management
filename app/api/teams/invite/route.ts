import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { z } from "zod";
import crypto from "crypto";

const inviteSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("VIEWER"),
  teamId: z.string().optional(),
  sendEmail: z.boolean().default(false),
});

// POST - Invite user to team or platform
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if current user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { 
        role: true,
        name: true,
        email: true,
        teamMembers: {
          include: {
            team: true,
          },
        },
      },
    });

    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can invite users" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = inviteSchema.parse(body);

    // If no teamId provided and user is not in any team, create a default team
    let teamId = validated.teamId;
    
    if (!teamId && currentUser.teamMembers.length === 0) {
      console.log("🏢 Admin not in any team, creating default team");
      
      // Generate unique slug from email or name
      const baseSlug = (currentUser.name || currentUser.email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 30);
      
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const slug = `${baseSlug}-${randomSuffix}`;
      
      // Generate secure random passwords for all roles
      const crypto = require("crypto");
      const bcrypt = require("bcryptjs");
      
      const defaultPasswordAdmin = crypto.randomBytes(16).toString("hex");
      const defaultPasswordEditor = crypto.randomBytes(16).toString("hex");
      const defaultPasswordViewer = crypto.randomBytes(16).toString("hex");
      
      const hashedPasswordAdmin = await bcrypt.hash(defaultPasswordAdmin, 10);
      const hashedPasswordEditor = await bcrypt.hash(defaultPasswordEditor, 10);
      const hashedPasswordViewer = await bcrypt.hash(defaultPasswordViewer, 10);
      
      const defaultTeam = await prisma.team.create({
        data: {
          name: `${currentUser.name || currentUser.email}'s Team`,
          slug: slug,
          description: "Default team",
          passwordAdmin: hashedPasswordAdmin,
          passwordEditor: hashedPasswordEditor,
          passwordViewer: hashedPasswordViewer,
          members: {
            create: {
              userId: session.userId,
              role: "ADMIN" as any,
            },
          },
        },
      });
      teamId = defaultTeam.id;
      console.log(`✅ Created default team: ${teamId} (slug: ${slug})`);
      console.log(`🔑 Admin Password: ${defaultPasswordAdmin}`);
      console.log(`🔑 Editor Password: ${defaultPasswordEditor}`);
      console.log(`🔑 Viewer Password: ${defaultPasswordViewer}`);
    } else if (!teamId && currentUser.teamMembers.length > 0) {
      // Use the first team the admin is a member of
      teamId = currentUser.teamMembers[0].team.id;
      console.log(`📋 Using existing team: ${teamId}`);
    }

    // Generate unique invitation token
    const token = crypto.randomBytes(32).toString("hex");
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation record
    const invitation = await prisma.invitation.create({
      data: {
        email: validated.email,
        role: validated.role,
        token,
        teamId: teamId,
        inviterId: session.userId,
        expiresAt,
        status: "PENDING",
      },
    });

    // Check if user already exists and create notification
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      // Create in-app notification for existing user
      const inviterName = currentUser.name || currentUser.email || "A team member";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const inviteUrl = `${appUrl}/invite/${token}`;
      
      await prisma.notification.create({
        data: {
          userId: existingUser.id,
          type: "ASSIGNMENT",
          title: "Team Invitation Received",
          message: `${inviterName} has invited you to join as ${validated.role}`,
          link: inviteUrl,
          isRead: false,
        },
      });
      
      console.log(`📬 Created notification for existing user: ${validated.email}`);
    }

    // Send invitation email if requested
    if (validated.sendEmail) {
      try {
        const sgMail = (await import("@sendgrid/mail")).default;
        const apiKey = process.env.SENDGRID_API_KEY;
        
        if (!apiKey) {
          console.warn("SendGrid API key not configured, skipping email");
        } else {
          sgMail.setApiKey(apiKey);
          
          const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@yourdomain.com";
          const fromName = process.env.SENDGRID_FROM_NAME || "Unified Outreach";
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          
          // Get the inviter's name
          const inviter = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { name: true, email: true },
          });
          
          const inviterName = inviter?.name || inviter?.email || "A team member";
          const inviteUrl = `${appUrl}/invite/${token}`;
          
          await sgMail.send({
            to: validated.email,
            from: {
              email: fromEmail,
              name: fromName,
            },
            subject: `You've been invited to join ${fromName}`,
            text: `Hi there!

${inviterName} has invited you to join our team on ${fromName}.

Click the link below to accept your invitation and get started:
${inviteUrl}

This invitation will expire in 7 days.

Welcome aboard!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">You've been invited! 🎉</h2>
                <p>Hi there,</p>
                <p><strong>${inviterName}</strong> has invited you to join our team on <strong>${fromName}</strong>.</p>
                <p>You've been assigned the <strong>${validated.role}</strong> role.</p>
                <div style="margin: 30px 0;">
                  <a href="${inviteUrl}" 
                     style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Accept Invitation
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't expect this invitation, you can safely ignore this email.</p>
              </div>
            `,
          });
          
          console.log(`✅ Invitation email sent to ${validated.email}`);
        }
      } catch (emailError) {
        console.error("Failed to send invitation email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
      },
      message: validated.sendEmail
        ? "Invitation sent successfully"
        : "Invitation created successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Error inviting user:", error);
    return NextResponse.json(
      { error: "Failed to invite user" },
      { status: 500 }
    );
  }
}

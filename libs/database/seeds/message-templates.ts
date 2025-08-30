import { PrismaClient } from '../../../apps/modules/database/client';

const prisma = new PrismaClient();

export async function seedMessageTemplates() {
  console.log('Seeding message templates...');

  // Get or create admin user for template creation
  let adminUser = await prisma.user.findFirst({
    where: {
      role: {
        name: 'super_admin'
      }
    }
  });

  if (!adminUser) {
    console.log('No super_admin user found, skipping template seeding');
    return;
  }

  const templates = [
    // Credit Warning Templates
    {
      name: 'credit_warning_email',
      type: 'email',
      category: 'credit_warning',
      subject: '⚠️ Low Credit Warning - ${system.companyName}',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ffc107; color: #333; padding: 20px; text-align: center;">
            <h1>⚠️ Low Credit Warning</h1>
          </div>
          <div style="padding: 20px; background-color: #f8f9fa;">
            <h2>Dear \${user.fullName},</h2>
            <p>Your credit balance is running low. Please top up soon to avoid service interruption.</p>
            
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p><strong>Current Balance:</strong> \${client.credit} EGP</p>
              <p><strong>Client:</strong> \${client.name}</p>
              <p><strong>Active Devices:</strong> \${client.deviceCount}</p>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffc107;">
              <h3 style="margin-top: 0; color: #856404;">⚠️ Important Notice</h3>
              <p style="margin-bottom: 0; color: #856404;">Your devices will be automatically shut down if balance falls below the critical threshold. Keep your balance above the warning level to avoid interruptions.</p>
            </div>
            
            <h3>How to top up:</h3>
            <ol>
              <li>Visit any Fawry machine or use the Fawry mobile app</li>
              <li>Use payment code: <strong>\${client.fawryPaymentId}</strong></li>
              <li>Recommended top-up: 100 EGP or more</li>
            </ol>
            
            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #bee5eb;">
              <p style="margin: 0;"><strong>Need help?</strong> Contact support at \${system.supportEmail} or call \${system.supportPhone}</p>
            </div>
          </div>
        </div>
      `,
      variables: {
        client: {
          credit: 'Current credit balance',
          name: 'Client name',
          fawryPaymentId: 'Fawry payment ID',
          deviceCount: 'Number of active devices'
        },
        user: {
          fullName: 'User full name'
        },
        system: {
          companyName: 'Company name',
          supportEmail: 'Support email',
          supportPhone: 'Support phone'
        }
      }
    },
    {
      name: 'credit_warning_sms',
      type: 'sms',
      category: 'credit_warning',
      subject: null,
      content: '${system.companyName}: Low credit warning! Balance: ${client.credit} EGP. Top up via Fawry using code ${client.fawryPaymentId} to avoid service interruption.',
      variables: {
        client: {
          credit: 'Current credit balance',
          fawryPaymentId: 'Fawry payment ID'
        },
        system: {
          companyName: 'Company name'
        }
      }
    },

    // Critical Credit Templates
    {
      name: 'credit_critical_email',
      type: 'email',
      category: 'credit_critical',
      subject: '🚨 URGENT: Service Suspended - ${system.companyName}',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
            <h1>🚨 Service Suspended</h1>
            <p style="margin: 0; font-size: 16px;">Immediate Action Required</p>
          </div>
          <div style="padding: 20px; background-color: #f8f9fa;">
            <h2>Dear \${user.fullName},</h2>
            <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #f5c6cb;">
              <p style="color: #721c24; font-size: 18px; font-weight: bold; margin: 0;">Your devices have been automatically shut down due to insufficient credit.</p>
            </div>
            
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <p><strong>Current Balance:</strong> \${client.credit} EGP</p>
              <p><strong>Client:</strong> \${client.name}</p>
              <p><strong>Devices Affected:</strong> \${client.deviceCount}</p>
              <p><strong>Shutdown Time:</strong> Now</p>
            </div>
            
            <h3>⚠️ What happens now?</h3>
            <ul style="color: #721c24;">
              <li>All your devices have been turned off automatically</li>
              <li>Devices cannot be turned back on until credit is added</li>
              <li>Any attempt to control devices will be blocked</li>
              <li>Your system is now offline</li>
            </ul>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border: 2px solid #ffc107;">
              <h3 style="margin-top: 0; color: #856404;">💳 How to restore service immediately:</h3>
              <ol style="color: #856404;">
                <li><strong>Go to any Fawry machine or use Fawry mobile app</strong></li>
                <li><strong>Use payment code: \${client.fawryPaymentId}</strong></li>
                <li><strong>Minimum top-up: 50 EGP (Recommended: 200+ EGP)</strong></li>
                <li><strong>Your devices will reactivate automatically after payment confirmation</strong></li>
              </ol>
            </div>
            
            <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #c3e6cb;">
              <p style="margin: 0; color: #155724;"><strong>💡 Pro Tip:</strong> Set up automatic top-ups to avoid future interruptions. Keep your balance above 50 EGP for uninterrupted service.</p>
            </div>
            
            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #bee5eb;">
              <p style="margin: 0;"><strong>🆘 Need immediate help?</strong><br>
              Email: \${system.supportEmail}<br>
              Phone: \${system.supportPhone}<br>
              We're here to help 24/7!</p>
            </div>
          </div>
        </div>
      `,
      variables: {
        client: {
          credit: 'Current credit balance',
          name: 'Client name',
          fawryPaymentId: 'Fawry payment ID',
          deviceCount: 'Number of devices affected'
        },
        user: {
          fullName: 'User full name'
        },
        system: {
          companyName: 'Company name',
          supportEmail: 'Support email',
          supportPhone: 'Support phone'
        }
      }
    },
    {
      name: 'credit_critical_sms',
      type: 'sms',
      category: 'credit_critical',
      subject: null,
      content: 'URGENT: Your ${system.companyName} devices have been shut down due to insufficient credit (${client.credit} EGP). Top up via Fawry using code ${client.fawryPaymentId} immediately to restore service.',
      variables: {
        client: {
          credit: 'Current credit balance',
          fawryPaymentId: 'Fawry payment ID'
        },
        system: {
          companyName: 'Company name'
        }
      }
    },

    // Device Reactivated Templates
    {
      name: 'device_reactivated_email',
      type: 'email',
      category: 'device_reactivated',
      subject: '✅ Service Restored - ${system.companyName}',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
            <h1>✅ Service Restored!</h1>
            <p style="margin: 0; font-size: 16px;">Your devices are back online</p>
          </div>
          <div style="padding: 20px; background-color: #f8f9fa;">
            <h2>Dear \${user.fullName},</h2>
            <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #c3e6cb;">
              <p style="color: #155724; font-size: 18px; font-weight: bold; margin: 0;">🎉 Great news! Your payment has been received and your devices have been reactivated.</p>
            </div>
            
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
              <p><strong>New Balance:</strong> \${client.credit} EGP</p>
              <p><strong>Client:</strong> \${client.name}</p>
              <p><strong>Status:</strong> ✅ All devices operational</p>
              <p><strong>Restored At:</strong> Now</p>
            </div>
            
            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #bee5eb;">
              <h3 style="margin-top: 0;">📊 What's working now:</h3>
              <ul>
                <li>✅ All devices are online and operational</li>
                <li>✅ Remote control is fully restored</li>
                <li>✅ Monitoring and alerts are active</li>
                <li>✅ Data collection has resumed</li>
              </ul>
            </div>
            
            <p style="font-size: 16px;">Thank you for your prompt payment. Your \${system.companyName} service has been fully restored and all systems are operational.</p>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffc107;">
              <p style="margin: 0; color: #856404;"><strong>💡 Future Tip:</strong> To avoid service interruptions, we recommend maintaining a balance above 100 EGP and setting up automatic top-ups when available.</p>
            </div>
            
            <div style="background-color: #e2e3e5; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #d6d8db;">
              <p style="margin: 0;"><strong>Questions or concerns?</strong><br>
              Contact us at \${system.supportEmail} or \${system.supportPhone}<br>
              We're always here to help!</p>
            </div>
          </div>
        </div>
      `,
      variables: {
        client: {
          credit: 'New credit balance',
          name: 'Client name'
        },
        user: {
          fullName: 'User full name'
        },
        system: {
          companyName: 'Company name',
          supportEmail: 'Support email',
          supportPhone: 'Support phone'
        }
      }
    },
    {
      name: 'device_reactivated_sms',
      type: 'sms',
      category: 'device_reactivated',
      subject: null,
      content: '${system.companyName}: ✅ Service restored! Your devices have been reactivated. New balance: ${client.credit} EGP. All systems operational.',
      variables: {
        client: {
          credit: 'New credit balance'
        },
        system: {
          companyName: 'Company name'
        }
      }
    }
  ];

  for (const template of templates) {
    try {
      await prisma.messageTemplate.upsert({
        where: {
          name: template.name
        },
        update: {
          ...template,
          createdBy: adminUser.id,
          updatedBy: adminUser.id
        },
        create: {
          ...template,
          createdBy: adminUser.id
        }
      });
      console.log(`✅ Template '${template.name}' seeded successfully`);
    } catch (error) {
      console.error(`❌ Failed to seed template '${template.name}':`, error);
    }
  }

  console.log('Message templates seeding completed');
}

// Run if called directly
if (require.main === module) {
  seedMessageTemplates()
    .catch((e) => {
      console.error('Error seeding message templates:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
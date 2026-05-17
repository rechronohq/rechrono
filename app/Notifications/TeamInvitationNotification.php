<?php

namespace App\Notifications;

use App\Models\TeamInvitation;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TeamInvitationNotification extends Notification
{
    public function __construct(public TeamInvitation $invitation) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $team = $this->invitation->team;

        return (new MailMessage)
            ->subject("Join {$team->name} on Rechrono")
            ->line("You have been invited to join {$team->name} on Rechrono.")
            ->line('Create your account to access the team workspace.')
            ->action('Accept invitation', route('team-invitations.show', $this->invitation->token));
    }
}

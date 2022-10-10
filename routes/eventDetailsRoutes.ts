import express, { Request, Response } from 'express';
import { client } from '../app';
import { isLoggedInAPI, isLoggedInInvitation } from '../util/guard';
import { logger } from '../util/logger';
import crypto from 'crypto';

export const eventDetailsRoutes = express.Router();

eventDetailsRoutes.get('/created/:id', isLoggedInAPI, getCreatedEventDetails);
eventDetailsRoutes.get('/participated/:id', isLoggedInAPI, getParticipatedEventDetails);
eventDetailsRoutes.put('/datetime/:id', isLoggedInAPI, updateDateTime);
eventDetailsRoutes.put('/venue/:id', isLoggedInAPI, updateVenue);
eventDetailsRoutes.get('/invitation/:id', isLoggedInAPI, getInvitationLink);
eventDetailsRoutes.post('/validation/:eventId/:token', isLoggedInInvitation, validateInvitationToken);
eventDetailsRoutes.post('/participation/:eventId/:token', isLoggedInInvitation, joinEvent);

async function getCreatedEventDetails(req: Request, res: Response) {
	try {
		logger.debug('Before reading DB');
		const eventId = req.params.id;
		const [event] = (
			await client.query(
				`
            SELECT * FROM events
            WHERE id = $1
            AND creator_id = $2;
        `,
				[parseInt(eventId), req.session.user]
			)
		).rows;

		if (event) {
			const [creatorDetail] = (await client.query(`
				SELECT * FROM users
				WHERE id = $1;
			`,
				[req.session.user]
			)).rows;
			const participantList = (
				await client.query(
					`
                SELECT users.id, users.first_name, users.last_name FROM users
                INNER JOIN participants ON participants.user_id = users.id
                INNER JOIN events ON participants.event_id = events.id
                WHERE events.id = $1;
            `,
					[parseInt(eventId)]
				)
			).rows;
			res.json({
				status: true,
				creator: creatorDetail,
				detail: event,
				participants: participantList
			});
		} else {
			res.json({
				status: false
			});
		}
	} catch (e) {
		logger.error(e);
		res.status(500).json({
			msg: '[ETD001]: Failed to get Created Event Details'
		});
	}
}

async function getParticipatedEventDetails(req: Request, res: Response) {
	try {
		logger.debug('Before reading DB');
		const eventId = req.params.id;
		const [event] = (
			await client.query(
				`
            SELECT events.* FROM events
            INNER JOIN participants ON participants.event_id = events.id
            INNER JOIN users ON participants.user_id = users.id
            WHERE events.id = $1 AND users.id = $2;
        `,
				[parseInt(eventId), req.session.user]
			)
		).rows;

		if (event) {
			const [creatorDetail] = (await client.query(`
				SELECT * FROM users
				INNER JOIN events ON events.creator_id = users.id
				WHERE events.id = $1;
			`,
				[parseInt(eventId)]
			)).rows;
			const participantList = (
				await client.query(
					`
                SELECT users.id, users.first_name, users.last_name FROM users
                INNER JOIN participants ON participants.user_id = users.id
                INNER JOIN events ON participants.event_id = events.id
                WHERE events.id = $1;
            `,
					[parseInt(eventId)]
				)
			).rows;

			res.json({
				status: true,
				creator: creatorDetail,
				detail: event,
				participants: participantList
			});
		} else {
			res.json({
				status: false
			});
		}
	} catch (e) {
		logger.error(e);
		res.status(500).json({
			msg: '[ETD002]: Failed to get Participated Event Details'
		});
	}
}

async function updateDateTime(req: Request, res: Response) {
	try {
		logger.debug('Before reading DB');
		const eventId = req.params.id;
		const [event] = (
			await client.query(
				`
            SELECT * FROM events
            WHERE id = $1
            AND creator_id = $2;
        `,
				[parseInt(eventId), req.session.user]
			)
		).rows;

		if (event) {
			await client.query(
				`
                UPDATE events
                SET start_datetime = $1, end_datetime = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3;
            `,
				[req.body.startTime, req.body.endTime, parseInt(eventId)]
			);
			res.json({ status: true });
		} else {
			res.json({ status: false });
		}
	} catch (e) {
		logger.error(e);
		res.status(500).json({
			msg: '[ETD003]: Failed to update date/time'
		});
	}
}

async function updateVenue(req: Request, res: Response) {
	try {
		logger.debug('Before reading DB');
		const eventId = req.params.id;
		const [event] = (
			await client.query(
				`
            SELECT * FROM events
            WHERE id = $1
            AND creator_id = $2;
        `,
				[parseInt(eventId), req.session.user]
			)
		).rows;

		if (event) {
			await client.query(
				`
                UPDATE events
                SET venue = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2;
            `,
				[req.body.venue, parseInt(eventId)]
			);
			res.json({ status: true });
		} else {
			res.json({ status: false });
		}
	} catch (e) {
		logger.error(e);
		res.status(500).json({
			msg: '[ETD004]: Failed to update venue'
		});
	}
}

async function getInvitationLink(req: Request, res: Response) {
	try {
		logger.debug('Before reading DB');
		const eventId = req.params.id;
		const [event] = (
			await client.query(
				`
            SELECT * FROM events
            WHERE id = $1
            AND creator_id = $2;
        `,
				[parseInt(eventId), req.session.user]
			)
		).rows;

		if (event) {
			const invitation_token = crypto.randomBytes(64).toString('hex');
			await client.query(`
				UPDATE events SET invitation_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;
			`,
				[invitation_token, parseInt(eventId)]
			);
			res.json({
				status: true,
				invitation_token
			});
		} else {
			res.json({ status: false });
		}
	} catch (e) {
		logger.error(e);
		res.status(500).json({
			msg: '[ETD005]: Failed to copy invitation link'
		});
	}
}

async function validateInvitationToken(req: Request, res: Response) {
	try {
		const [eventDetail] = (await client.query(`
			SELECT * FROM events
			WHERE id = $1 AND invitation_token = $2;
		`,
			[req.params.eventId, req.params.token]
		)).rows;

		if (eventDetail) {
			res.json({
				status: true,
				eventDetail
			});
		} else {
			res.json({
				status: false,
				login: true
			});
		}

	} catch (e) {
		logger.error(e);
		res.status(500).json({
			msg: '[ETD005]: Failed to validate invitation link'
		});
	}
}

async function joinEvent(req: Request, res: Response) {
	try {
		const [eventDetail] = (await client.query(`
			SELECT * FROM events
			WHERE id = $1 AND invitation_token = $2;
		`,
			[req.params.eventId, req.params.token]
		)).rows;

		if (eventDetail) {
			if (eventDetail.creator_id === req.session.user) {
				res.json({
					status: false,
					login: true,
					isCreator: true
				});
			} else {
				const [participant] = (await client.query(`
					SELECT * FROM participants
					WHERE event_id = $1 AND user_id = $2;
				`,
					[req.params.eventId, req.session.user]
				)).rows;
				if (participant) {
					res.json({
						status: false,
						login: true,
						joined: true
					});
				} else {
					await client.query(`
						INSERT INTO participants (event_id, user_id, created_at, updated_at)
						VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
					`,
						[req.params.eventId, req.session.user]
					);
					res.json({ status: true });
				}
			}
		} else {
			res.json({
				status: false,
				login: true
			});
		}

	} catch (e) {
		logger.error(e);
		res.status(500).json({
			msg: '[ETD006]: Failed to join event'
		});
	}
}
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { ROLES } from '@/lib/roles'
import { authOptions } from '@/lib/authOptions'
import { deleteS3File, extractS3KeyFromUrl } from '@/lib/utils' 
import { invalidateProfileIfNeeded } from '@/lib/profileCache'
import { invalidatePublicationsCache } from '@/lib/publicationsCache';
import { PUBLICATION_TYPES } from '../../../lib/const'
import { getFacultySpecialPermissions } from '@/lib/specialPermissions'

export async function POST(request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json(
      { message: 'You are not authorized' },
      { status: 403 }
    )
  }

  try {
    const { type, ...params } = await request.json()

    // Notice deletion (single or batch)
    if (type === 'notice' || type === 'notices') {
      const noticeIds = Array.isArray(params.ids) ? params.ids : (params.id ? [params.id] : []);

      if (noticeIds.length === 0) {
        return NextResponse.json(
          { message: 'Notice ID(s) not provided' },
          { status: 400 }
        );
      }

      const dbPerms = await getFacultySpecialPermissions(session.user.email);
      const userSpecialPerms = Array.from(new Set([
        ...(session.user.specialPermissions || []),
        ...dbPerms
      ])).map(p => String(p).toLowerCase());

      const deleteNoticeById = async (noticeId) => {
        const notice = await query(
          `SELECT attachments, email, notice_type, department FROM notices WHERE id = ?`,
          [noticeId]
        );

        if (!notice || notice.length === 0) {
          return { id: noticeId, status: 'not_found' };
        }

        const noticeData = notice[0];
        const nType = noticeData.notice_type?.toLowerCase();

        const canDeleteNotice = 
          session.user.role === 'SUPER_ADMIN' ||
          (session.user.role === 'ACADEMIC_ADMIN' && nType === 'academics') ||
          (session.user.role === 'DEPT_ADMIN' && 
           nType === 'department' && 
           noticeData.department === session.user.department) ||
          (session.user.role === 'TENDER_NOTICE_ADMIN' && nType === 'tender') ||
          (session.user.role === 'EXAM_ADMIN' && nType === 'exam') ||
          userSpecialPerms.includes(nType);

        if (!canDeleteNotice) {
          return { id: noticeId, status: 'unauthorized' };
        }

        // Delete managed S3 files using exact s3_key
        try {
          const managedFiles = await query(
            `SELECT id, s3_key FROM notice_attachments WHERE notice_id = ?`,
            [noticeId]
          );
          
          if (managedFiles && managedFiles.length > 0) {
            console.log(`[Notice Deletion] Notice ID ${noticeId} has ${managedFiles.length} managed files.`);
            const managedDeletionPromises = managedFiles.map(async (file) => {
              try {
                if (file.s3_key) {
                  await deleteS3File(file.s3_key);
                  console.log(`[Notice Deletion] Successfully deleted managed key: ${file.s3_key}`);
                }
              } catch (deleteError) {
                console.error(`[Notice Deletion] Failed to delete managed key ${file.s3_key}:`, deleteError.message);
              }
            });
            await Promise.all(managedDeletionPromises);
            await query(`DELETE FROM notice_attachments WHERE notice_id = ?`, [noticeId]);
          }
        } catch (err) {
          console.error('[Notice Deletion] Error handling managed files:', err);
        }

        // Delete S3 files if attachments exist
        if (noticeData.attachments) {
          try {
            const attachments = typeof noticeData.attachments === 'string'
              ? JSON.parse(noticeData.attachments)
              : noticeData.attachments;
            
            if (Array.isArray(attachments)) {
              const deletionPromises = attachments.map(async (attachment) => {
                try {
                  let keyToDelete = null;
                  if (attachment.key) {
                    keyToDelete = attachment.key;
                  } else if (attachment.url && typeof attachment.url === 'string' && attachment.url.includes('.amazonaws.com')) {
                    keyToDelete = extractS3KeyFromUrl(attachment.url);
                  }

                  if (keyToDelete) {
                    await deleteS3File(keyToDelete);
                    console.log(`[Notice Deletion] Successfully deleted key: ${keyToDelete}`);
                  }
                } catch (deleteError) {
                  console.error(`[Notice Deletion] Failed to delete attachment`, { attachment, error: deleteError.message });
                }
              });
              await Promise.all(deletionPromises);
            }
          } catch (error) {
            console.error('[Notice Deletion] Error processing attachments for notice ID ' + noticeId, error);
          }
        }

        // Now delete the notice from database
        const result = await query(
          `DELETE FROM notices WHERE id = ?`,
          [noticeId]
        );

        if (noticeData.email) {
          await invalidateProfileIfNeeded(type, { ...params, id: noticeId, email: noticeData.email });
        }

        return { id: noticeId, status: 'deleted', result };
      };

      const deletionResults = await Promise.all(noticeIds.map(id => deleteNoticeById(id)));

      // If called with a single ID (legacy format), maintain exact previous response behavior
      if (!Array.isArray(params.ids)) {
        const singleResult = deletionResults[0];
        if (singleResult.status === 'not_found') {
          return NextResponse.json({ message: 'Notice not found' }, { status: 404 });
        }
        if (singleResult.status === 'unauthorized') {
          return NextResponse.json({ message: 'Not authorized to delete notices' }, { status: 403 });
        }
        return NextResponse.json(singleResult.result);
      }

      const deletedCount = deletionResults.filter(r => r.status === 'deleted').length;
      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${deletedCount} of ${noticeIds.length} notice(s)`,
        deletedCount,
        results: deletionResults
      });
    }

    if (type === 'guest_lecture') {
      const dbPerms = await getFacultySpecialPermissions(session.user.email);
      const userSpecialPerms = Array.from(new Set([
        ...(session.user.specialPermissions || []),
        ...dbPerms
      ])).map(p => String(p).toLowerCase());

      const canDeleteGuestLecture = 
        session.user.role === 'SUPER_ADMIN' ||
        session.user.role === 'DEPT_ADMIN' ||
        session.user.role === 'ACADEMIC_ADMIN' ||
        userSpecialPerms.includes('guest-lectures');

      if (!canDeleteGuestLecture) {
        return NextResponse.json(
          { message: 'Not authorized to delete guest lectures' },
          { status: 403 }
        );
      }

      const result = await query(
        `DELETE FROM guest_lectures WHERE id = ?`,
        [params.id]
      );
      
      return NextResponse.json(result);
    }

    if (type === 'institute_lecture') {
      const dbPerms = await getFacultySpecialPermissions(session.user.email);
      const userSpecialPerms = Array.from(new Set([
        ...(session.user.specialPermissions || []),
        ...dbPerms
      ])).map(p => String(p).toLowerCase());

      const canDeleteInstituteLecture = 
        session.user.role === 'SUPER_ADMIN' ||
        session.user.role === 'DEPT_ADMIN' ||
        session.user.role === 'ACADEMIC_ADMIN' ||
        userSpecialPerms.includes('institute-lectures');

      if (!canDeleteInstituteLecture) {
        return NextResponse.json(
          { message: 'Not authorized to delete institute lectures' },
          { status: 403 }
        );
      }

      const result = await query(
        `DELETE FROM institute_lectures WHERE id = ?`,
        [params.id]
      );
      
      return NextResponse.json(result);
    }

    if (type === 'event') {
      const dbPerms = await getFacultySpecialPermissions(session.user.email);
      const userSpecialPerms = Array.from(new Set([
        ...(session.user.specialPermissions || []),
        ...dbPerms
      ])).map(p => String(p).toLowerCase());

      const canDeleteEvent = 
        session.user.role === 'SUPER_ADMIN' ||
        session.user.role === 'DEPT_ADMIN' ||
        session.user.role === 'ACADEMIC_ADMIN' ||
        userSpecialPerms.includes('events');

      if (!canDeleteEvent) {
        return NextResponse.json(
          { message: 'Not authorized to delete events' },
          { status: 403 }
        );
      }

      const eventResult = await query(
        `DELETE FROM events WHERE id = ?`,
        [params.id]
      );
      await invalidateProfileIfNeeded(type, params);
      return NextResponse.json(eventResult);
    }

    if (type === 'department_achievement' || type === 'achievement' || type === 'department_achievements' || type === 'achievements') {
      const achievementIds = Array.isArray(params.ids) ? params.ids : (params.id ? [params.id] : []);

      if (achievementIds.length === 0) {
        return NextResponse.json(
          { message: 'Achievement ID(s) not provided' },
          { status: 400 }
        );
      }

      const dbPerms = await getFacultySpecialPermissions(session.user.email);
      const userSpecialPerms = Array.from(new Set([
        ...(session.user.specialPermissions || []),
        ...dbPerms
      ])).map(p => String(p).toLowerCase());

      const userDept = session.user.department?.trim().toLowerCase();
      const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
      const hasSpecialPerm = userSpecialPerms.includes('department-achievements') || userSpecialPerms.includes('achievements');

      const deleteAchievementById = async (achievementId) => {
        const rows = await query(
          `SELECT id, department, banner_image, attachments FROM department_achievements WHERE id = ? LIMIT 1`,
          [achievementId]
        );

        if (!rows || rows.length === 0) {
          return { id: achievementId, status: 'not_found' };
        }

        const item = rows[0];
        const achievementDept = item.department?.trim().toLowerCase();
        const isDeptAdminForDept = session.user.role === 'DEPT_ADMIN' && (!userDept || userDept === achievementDept);

        const canDelete = isSuperAdmin || isDeptAdminForDept || hasSpecialPerm;

        if (!canDelete) {
          return { id: achievementId, status: 'unauthorized' };
        }

        // Delete banner image from S3 if present
        if (item.banner_image && typeof item.banner_image === 'string' && item.banner_image.includes('.amazonaws.com')) {
          try {
            const key = extractS3KeyFromUrl(item.banner_image);
            if (key) {
              await deleteS3File(key);
            }
          } catch (err) {
            console.error('[Achievement Delete] Error deleting banner image:', err);
          }
        }

        // Delete attachments from S3 if present
        if (item.attachments) {
          try {
            const attachments = typeof item.attachments === 'string' ? JSON.parse(item.attachments) : item.attachments;
            if (Array.isArray(attachments)) {
              for (const att of attachments) {
                let keyToDelete = att.key;
                if (!keyToDelete && att.url && typeof att.url === 'string' && att.url.includes('.amazonaws.com')) {
                  keyToDelete = extractS3KeyFromUrl(att.url);
                }
                if (keyToDelete) {
                  await deleteS3File(keyToDelete);
                }
              }
            }
          } catch (err) {
            console.error('[Achievement Delete] Error deleting attachments:', err);
          }
        }

        const result = await query(
          `DELETE FROM department_achievements WHERE id = ?`,
          [achievementId]
        );

        return { id: achievementId, status: 'deleted', result };
      };

      const results = await Promise.all(achievementIds.map(id => deleteAchievementById(id)));

      if (!Array.isArray(params.ids)) {
        const single = results[0];
        if (single.status === 'not_found') {
          return NextResponse.json({ message: 'Achievement not found' }, { status: 404 });
        }
        if (single.status === 'unauthorized') {
          return NextResponse.json({ message: 'Not authorized to delete this achievement' }, { status: 403 });
        }
        return NextResponse.json(single.result);
      }

      const deletedCount = results.filter(r => r.status === 'deleted').length;
      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${deletedCount} of ${achievementIds.length} achievement(s)`,
        deletedCount,
        results
      });
    }

    // Super Admin only operations
    if (session.user.role === 'SUPER_ADMIN') {
      switch (type) {
        case 'user':
          // Delete user and all related data
          const tables = [
            'phd_candidates',
            'journal_papers',
            'conference_papers',
            'textbooks',
            'edited_books',
            'book_chapters',
            'sponsored_projects',
            'consultancy_projects',
            'teaching_engagement',
            "memberships",
            'project_supervision',
            'workshops_conferences',
            'institute_activities',
            'department_activities',
            'work_experience',
            'ipr',
            'startups',
            'internships',
            'user',
            'education'
          ]

          for (const table of tables) {
            await query(
              `DELETE FROM ${table} WHERE email = ?`,
              [params.email]
            ).catch(e => console.error(`Error deleting from ${table}:`, e))
          }
          await invalidateProfileIfNeeded(type, params);
          await invalidatePublicationsCache(null);
          return NextResponse.json({ message: 'User and related data deleted successfully' })

        case 'webteam':
          const webteamResult = await query(
            `DELETE FROM webteam WHERE id = ?`,
            [params.id]
          )
          await invalidateProfileIfNeeded(type, params);
          return NextResponse.json(webteamResult)

        case 'innovation':
          const innovationResult = await query(
            `DELETE FROM innovation WHERE id = ?`,
            [params.id]
          )
          await invalidateProfileIfNeeded(type, params);
          return NextResponse.json(innovationResult)

        case 'news':
          const newsResult = await query(
            `DELETE FROM news WHERE id = ?`,
            [params.id]
          )
          await invalidateProfileIfNeeded(type, params);
          return NextResponse.json(newsResult)
      }
    }

    // User specific deletions (email matches)
    if (session.user.email === params.email) {
      switch (type) {
        case 'phd_candidates':
          const phdResult = await query(
            `DELETE FROM phd_candidates WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);
          return NextResponse.json(phdResult)

          case 'patents':
            const deleteResult = await query(
                `DELETE FROM patents WHERE id = ?`,
                [params.id]
            );
            await invalidateProfileIfNeeded(type, params);
            if (deleteResult.affectedRows > 0) {
                return NextResponse.json({ message: 'Patent deleted successfully' });
            } else {
                return NextResponse.json({ message: 'Patent not found' }, { status: 404 });
            }
        

        case 'journal_papers':
          const journalResult = await query(
            `DELETE FROM journal_papers WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);
          if (PUBLICATION_TYPES.includes(type)) {
            await invalidatePublicationsCache(params.email);
          }
          return NextResponse.json(journalResult)

        case 'conference_papers':
          const conferenceResult = await query(
            `DELETE FROM conference_papers WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);
          if (PUBLICATION_TYPES.includes(type)) {
            await invalidatePublicationsCache(params.email);
          }
          return NextResponse.json(conferenceResult)

        case 'textbooks':
          const textbookResult = await query(
            `DELETE FROM textbooks WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);
          if (PUBLICATION_TYPES.includes(type)) {
            await invalidatePublicationsCache(params.email);
          }
          return NextResponse.json(textbookResult)

        case 'edited_books':
          const editedBookResult = await query(
            `DELETE FROM edited_books WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);
          return NextResponse.json(editedBookResult)

        case 'book_chapters':
          const chapterResult = await query(
            `DELETE FROM book_chapters WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);
          if (PUBLICATION_TYPES.includes(type)) {
            await invalidatePublicationsCache(params.email);
          }
          return NextResponse.json(chapterResult)

        case 'sponsored_projects':
          const sponsoredResult = await query(
            `DELETE FROM sponsored_projects WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);
          return NextResponse.json(sponsoredResult)

        case 'consultancy_projects':
          const consultancyResult = await query(
            `DELETE FROM consultancy_projects WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);
          return NextResponse.json(consultancyResult)

        case 'teaching_engagement':
          const teachingResult = await query(
            `DELETE FROM teaching_engagement WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);
          return NextResponse.json(teachingResult)

          case 'memberships':
            const deleteMembershipResult = await query(
                `DELETE FROM memberships WHERE id = ?`,
                [params.id]
            );
            await invalidateProfileIfNeeded(type, params);
            return NextResponse.json(deleteMembershipResult);

        case 'project_supervision':
          const supervisionResult = await query(
            `DELETE FROM project_supervision WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);

          return NextResponse.json(supervisionResult)

        case 'workshops_conferences':
          const workshopResult = await query(
            `DELETE FROM workshops_conferences WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);
          return NextResponse.json(workshopResult)

        case 'institute_activities':
          const instituteResult = await query(
            `DELETE FROM institute_activities WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);
          return NextResponse.json(instituteResult)

        case 'department_activities':
          const departmentResult = await query(
            `DELETE FROM department_activities WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);
          return NextResponse.json(departmentResult)

        case 'work_experience':
          const workExpResult = await query(
            `DELETE FROM work_experience WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);

          return NextResponse.json(workExpResult)

        case 'ipr':
          const iprResult = await query(
            `DELETE FROM ipr WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);
          return NextResponse.json(iprResult)

        case 'startups':
          const startupResult = await query(
            `DELETE FROM startups WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);
          return NextResponse.json(startupResult)

        case 'internships':
          const internshipResult = await query(
            `DELETE FROM internships WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);
          return NextResponse.json(internshipResult)
        case 'education':
          const educationResult = await query(
            `DELETE FROM education WHERE id = ? AND email = ?`,
            [params.id, params.email]
          )
          await invalidateProfileIfNeeded(type, params);
          return NextResponse.json(educationResult)

        case 'profile_image':
          const imageResult = await query(
            `UPDATE user SET image = NULL WHERE email = ?`,
            [params.email]
          )
          await invalidateProfileIfNeeded(type, params);

          return NextResponse.json(imageResult)

        case 'profile_cv':
          const cvResult = await query(
            `UPDATE user SET cv = NULL WHERE email = ?`,
            [params.email]
          )
          await invalidateProfileIfNeeded(type, params);
          return NextResponse.json(cvResult)
      }
    }

    return NextResponse.json(
      { message: 'Could not find matching requests' },
      { status: 400 }
    )

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }
} 
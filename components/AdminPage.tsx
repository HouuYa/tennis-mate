import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { adminLogin, verifyAdminToken, adminLogout } from '../services/adminAuthService';
import { useToast } from '../context/ToastContext';
import { Shield, Users, Calendar, Trophy, Edit3, Trash2, Save, X, Plus, ChevronDown, ChevronUp, ArrowLeft, Loader2, Merge, Undo2, AlertTriangle, Check, Clock } from 'lucide-react';
import { Tab } from '../types';
import { LocationPicker } from './LocationPicker';

interface Props {
  setTab: (t: Tab) => void;
  onExitAdmin?: () => void;
}

interface AdminPlayer {
  id: string;
  name: string;
  created_at: string;
}

interface AdminSession {
  id: string;
  played_at: string;
  location: string | null;
  status: string;
  created_at: string;
}

interface AdminMatch {
  id: string;
  session_id: string;
  played_at: string;
  end_time: string | null;
  team_a: { player1Id: string; player2Id: string };
  team_b: { player1Id: string; player2Id: string };
  score_a: number;
  score_b: number;
  is_finished: boolean;
  court_number: number;
}

// Pending operation types
type PendingOp =
  | { id: string; type: 'rename'; playerId: string; oldName: string; newName: string }
  | { id: string; type: 'delete-player'; player: AdminPlayer }
  | { id: string; type: 'merge'; keepId: string; removeId: string; keepName: string; removeName: string }
  | { id: string; type: 'edit-location'; sessionId: string; oldLocation: string | null; newLocation: string }
  | { id: string; type: 'delete-session'; session: AdminSession }
  | { id: string; type: 'edit-score'; matchId: string; sessionId: string; oldScoreA: number; oldScoreB: number; newScoreA: number; newScoreB: number }
  | { id: string; type: 'delete-match'; match: AdminMatch };

let opCounter = 0;
const nextOpId = () => `op-${++opCounter}`;

// Auth is now handled server-side via Netlify Function + JWT (adminAuthService.ts)

// RLS diagnostic result type
type RlsDiag = { canSelect: boolean; canInsert: boolean; canUpdate: boolean; canDelete: boolean; error?: string };

export const AdminPage: React.FC<Props> = ({ setTab, onExitAdmin }) => {
  const { showToast } = useToast();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Tab state
  const [activeSection, setActiveSection] = useState<'players' | 'sessions' | 'quick-entry'>('players');

  // Data state (original from DB)
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [loading, setLoading] = useState(false);

  // Pending operations
  const [pendingOps, setPendingOps] = useState<PendingOp[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [committing, setCommitting] = useState(false);

  // RLS diagnostic
  const [rlsDiag, setRlsDiag] = useState<RlsDiag | null>(null);

  // Edit state
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editMatchScoreA, setEditMatchScoreA] = useState(0);
  const [editMatchScoreB, setEditMatchScoreB] = useState(0);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionLocation, setEditSessionLocation] = useState('');

  // Merge state
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);

  // Quick Entry state
  const [qeSessionId, setQeSessionId] = useState('');
  const [qeNewLocation, setQeNewLocation] = useState('');
  const [qeNewDate, setQeNewDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [qeTeamA1, setQeTeamA1] = useState('');
  const [qeTeamA2, setQeTeamA2] = useState('');
  const [qeTeamB1, setQeTeamB1] = useState('');
  const [qeTeamB2, setQeTeamB2] = useState('');
  const [qeScoreA, setQeScoreA] = useState(0);
  const [qeScoreB, setQeScoreB] = useState(0);
  const [qeUseNewSession, setQeUseNewSession] = useState(false);
  const [qeSaving, setQeSaving] = useState(false);
  const [qeShowPlayerPicker, setQeShowPlayerPicker] = useState(false);
  const [qeNewPlayerName, setQeNewPlayerName] = useState('');
  const [qeAddingPlayer, setQeAddingPlayer] = useState(false);
  const [qeTargetTeam, setQeTargetTeam] = useState<'A' | 'B' | null>(null);

  // Drag & Drop
  type SlotKey = 'A1' | 'A2' | 'B1' | 'B2';
  const [qeDragPlayerId, setQeDragPlayerId] = useState<string | null>(null);
  const [qeDragFromSlot, setQeDragFromSlot] = useState<SlotKey | null>(null);
  const [qeDragOverSlot, setQeDragOverSlot] = useState<SlotKey | null>(null);

  // --- Computed: apply pending ops to get display data ---
  const displayPlayers = useMemo(() => {
    let result = [...players];
    for (const op of pendingOps) {
      if (op.type === 'rename') {
        result = result.map(p => p.id === op.playerId ? { ...p, name: op.newName } : p);
      } else if (op.type === 'delete-player') {
        result = result.filter(p => p.id !== op.player.id);
      } else if (op.type === 'merge') {
        result = result.filter(p => p.id !== op.removeId);
      }
    }
    return result;
  }, [players, pendingOps]);

  const displaySessions = useMemo(() => {
    let result = [...sessions];
    for (const op of pendingOps) {
      if (op.type === 'edit-location') {
        result = result.map(s => s.id === op.sessionId ? { ...s, location: op.newLocation || null } : s);
      } else if (op.type === 'delete-session') {
        result = result.filter(s => s.id !== op.session.id);
      }
    }
    return result;
  }, [sessions, pendingOps]);

  const displayMatches = useMemo(() => {
    let result = [...matches];
    for (const op of pendingOps) {
      if (op.type === 'edit-score') {
        result = result.map(m => m.id === op.matchId ? { ...m, score_a: op.newScoreA, score_b: op.newScoreB } : m);
      } else if (op.type === 'delete-match') {
        result = result.filter(m => m.id !== op.match.id);
      }
    }
    return result;
  }, [matches, pendingOps]);

  // Detect duplicate player names (case-insensitive)
  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, AdminPlayer[]>();
    for (const p of displayPlayers) {
      const key = p.name.toLowerCase().trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    return Array.from(groups.entries()).filter(([, v]) => v.length > 1);
  }, [displayPlayers]);

  // Ops for current section
  const currentSectionOps = useMemo(() => {
    if (activeSection === 'players') {
      return pendingOps.filter(op => op.type === 'rename' || op.type === 'delete-player' || op.type === 'merge');
    } else if (activeSection === 'sessions') {
      return pendingOps.filter(op => op.type === 'edit-location' || op.type === 'delete-session' || op.type === 'edit-score' || op.type === 'delete-match');
    }
    return [];
  }, [pendingOps, activeSection]);

  // --- RLS Diagnostic: tests INSERT/UPDATE/DELETE on players table ---
  const runRlsDiagnostic = async () => {
    const diag: RlsDiag = { canSelect: false, canInsert: false, canUpdate: false, canDelete: false };
    try {
      // 1. SELECT test
      const { error: selErr } = await supabase.from('players').select('id').limit(1);
      diag.canSelect = !selErr;
      if (selErr) { diag.error = `SELECT: ${selErr.message}`; setRlsDiag(diag); return; }

      // 2. INSERT test
      const testName = `__rls_test_${Date.now()}`;
      const { data: inserted, error: insErr } = await supabase
        .from('players').insert({ name: testName }).select().single();
      diag.canInsert = !insErr && !!inserted;
      if (insErr || !inserted) { diag.error = `INSERT: ${insErr?.message || 'no data returned'}`; setRlsDiag(diag); return; }

      const testId = inserted.id;

      // 3. UPDATE test
      const { data: updated, error: updErr } = await supabase
        .from('players').update({ name: testName + '_upd' }).eq('id', testId).select();
      diag.canUpdate = !updErr && (updated?.length ?? 0) > 0;
      if (updErr || !updated?.length) { diag.error = `UPDATE: ${updErr?.message || 'RLS blocked - 0 rows affected'}`; }

      // 4. DELETE test
      const { data: deleted, error: delErr } = await supabase
        .from('players').delete().eq('id', testId).select();
      diag.canDelete = !delErr && (deleted?.length ?? 0) > 0;
      if (delErr || !deleted?.length) { diag.error = `DELETE: ${delErr?.message || 'RLS blocked - 0 rows affected'}`; }
    } catch (e) {
      diag.error = `Exception: ${e instanceof Error ? e.message : String(e)}`;
    }
    setRlsDiag(diag);
  };

  // Verify saved token on mount (server-side validation)
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const valid = await verifyAdminToken();
      if (valid) {
        setIsAuthenticated(true);
      }
    };
    checkAuth();
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
      runRlsDiagnostic();
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    if (!adminId.trim() || !adminPassword.trim()) {
      setAuthError('ID와 비밀번호를 입력하세요');
      return;
    }
    setLoginLoading(true);
    setAuthError('');

    const result = await adminLogin(adminId, adminPassword);

    if (result.success) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError(result.error || 'Invalid credentials');
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    adminLogout();
    // Reset all form and data state on logout
    setActiveSection('players');
    setPlayers([]); setSessions([]); setMatches([]);
    setPendingOps([]);
    setEditingPlayerId(null); setEditPlayerName('');
    setExpandedSessionId(null);
    setEditingMatchId(null); setEditMatchScoreA(0); setEditMatchScoreB(0);
    setEditingSessionId(null); setEditSessionLocation('');
    setMergeSourceId(null); setMergeTargetId(null);
    setRlsDiag(null);
    // Quick Entry
    setQeSessionId(''); setQeNewLocation('');
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setQeNewDate(now.toISOString().slice(0, 16));
    setQeTeamA1(''); setQeTeamA2(''); setQeTeamB1(''); setQeTeamB2('');
    setQeScoreA(0); setQeScoreB(0);
    setQeUseNewSession(false); setQeShowPlayerPicker(false);
    setQeNewPlayerName(''); setQeTargetTeam(null);
    setQeDragPlayerId(null); setQeDragFromSlot(null); setQeDragOverSlot(null);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [playersRes, sessionsRes] = await Promise.all([
        supabase.from('players').select('*').order('name'),
        supabase.from('sessions').select('*').order('played_at', { ascending: false })
      ]);

      if (playersRes.data) setPlayers(playersRes.data);
      if (sessionsRes.data) setSessions(sessionsRes.data);
      // Clear pending ops on fresh load
      setPendingOps([]);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionMatches = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('session_id', sessionId)
        .order('played_at', { ascending: true });

      if (error) throw error;
      if (data) setMatches(data);
    } catch (error) {
      console.error('Failed to load matches:', error);
      showToast('Failed to load matches', 'error');
    }
  };

  // --- Pending: Player Operations ---
  const handleRenamePlayer = (playerId: string) => {
    if (!editPlayerName.trim()) return;
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    if (editPlayerName.trim() === player.name) {
      setEditingPlayerId(null);
      return;
    }
    // Remove any previous rename for this player
    setPendingOps(prev => [
      ...prev.filter(op => !(op.type === 'rename' && op.playerId === playerId)),
      { id: nextOpId(), type: 'rename', playerId, oldName: player.name, newName: editPlayerName.trim() }
    ]);
    setEditingPlayerId(null);
  };

  const handleDeletePlayer = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    // Clear any active edit/merge UI so it doesn't conflict with the deleted row
    if (editingPlayerId === playerId) setEditingPlayerId(null);
    if (mergeSourceId === playerId) { setMergeSourceId(null); setMergeTargetId(null); }
    setPendingOps(prev => [
      ...prev,
      { id: nextOpId(), type: 'delete-player', player }
    ]);
  };

  const handleMergePlayers = (keepId: string, removeId: string) => {
    const keep = displayPlayers.find(p => p.id === keepId);
    const remove = displayPlayers.find(p => p.id === removeId);
    if (!keep || !remove) return;
    setPendingOps(prev => [
      ...prev,
      { id: nextOpId(), type: 'merge', keepId, removeId, keepName: keep.name, removeName: remove.name }
    ]);
    setMergeSourceId(null);
    setMergeTargetId(null);
  };

  // --- Pending: Session Operations ---
  const handleEditLocation = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    setPendingOps(prev => [
      ...prev.filter(op => !(op.type === 'edit-location' && op.sessionId === sessionId)),
      { id: nextOpId(), type: 'edit-location', sessionId, oldLocation: session.location, newLocation: editSessionLocation.trim() }
    ]);
    setEditingSessionId(null);
  };

  const handleDeleteSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    setPendingOps(prev => [
      ...prev,
      { id: nextOpId(), type: 'delete-session', session }
    ]);
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
      setMatches([]);
    }
  };

  const handleEditMatchScore = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    setPendingOps(prev => [
      ...prev.filter(op => !(op.type === 'edit-score' && op.matchId === matchId)),
      { id: nextOpId(), type: 'edit-score', matchId, sessionId: match.session_id, oldScoreA: match.score_a, oldScoreB: match.score_b, newScoreA: editMatchScoreA, newScoreB: editMatchScoreB }
    ]);
    setEditingMatchId(null);
  };

  const handleDeleteMatch = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    setPendingOps(prev => [
      ...prev,
      { id: nextOpId(), type: 'delete-match', match }
    ]);
  };

  // --- Undo a pending op ---
  const undoOp = (opId: string) => {
    setPendingOps(prev => prev.filter(op => op.id !== opId));
  };

  // --- Commit all pending ops ---
  const handleCommitAll = async () => {
    setShowConfirmModal(false);
    setCommitting(true);

    // Warn if RLS diagnostic failed
    if (rlsDiag && !rlsDiag.canDelete) {
      const proceed = window.confirm(
        'Supabase DELETE 권한이 없는 것으로 진단되었습니다.\n' +
        'Supabase Dashboard에서 RLS Policy를 먼저 확인하시겠습니까?\n\n' +
        '계속 진행하려면 "확인"을 누르세요.'
      );
      if (!proceed) { setCommitting(false); return; }
    }

    // Snapshot ops to avoid closure issues
    const opsToCommit = [...pendingOps];
    let successCount = 0;
    const errors: string[] = [];

    // Sort: merges first, then renames/edits, then deletes last
    const sortedOps = [...opsToCommit].sort((a, b) => {
      const order: Record<string, number> = {
        'merge': 0, 'rename': 1, 'edit-score': 2, 'edit-location': 2,
        'delete-match': 3, 'delete-session': 4, 'delete-player': 5
      };
      return (order[a.type] ?? 2) - (order[b.type] ?? 2);
    });

    for (const op of sortedOps) {
      try {
        switch (op.type) {
          case 'merge': {
            // 1. Fetch ALL matches that reference the removeId
            const { data: allMatches, error: fetchErr } = await supabase
              .from('matches')
              .select('*');
            if (fetchErr) {
              errors.push(`병합 매치 조회 실패: ${fetchErr.message} (code: ${fetchErr.code})`);
              continue;
            }

            const toUpdate = (allMatches || []).filter((m: AdminMatch) =>
              m.team_a.player1Id === op.removeId ||
              m.team_a.player2Id === op.removeId ||
              m.team_b.player1Id === op.removeId ||
              m.team_b.player2Id === op.removeId
            );
            let matchUpdateFailed = false;
            for (const m of toUpdate) {
              const newTeamA = {
                player1Id: m.team_a.player1Id === op.removeId ? op.keepId : m.team_a.player1Id,
                player2Id: m.team_a.player2Id === op.removeId ? op.keepId : m.team_a.player2Id,
              };
              const newTeamB = {
                player1Id: m.team_b.player1Id === op.removeId ? op.keepId : m.team_b.player1Id,
                player2Id: m.team_b.player2Id === op.removeId ? op.keepId : m.team_b.player2Id,
              };
              const { data: updated, error: updateErr } = await supabase
                .from('matches')
                .update({ team_a: newTeamA, team_b: newTeamB })
                .eq('id', m.id)
                .select();
              if (updateErr) {
                errors.push(`병합 매치 업데이트 실패: ${updateErr.message} (code: ${updateErr.code})`);
                matchUpdateFailed = true;
                break;
              }
              if (!updated || updated.length === 0) {
                errors.push(`병합 매치 업데이트 실패: RLS 권한 부족 (match ${m.id})`);
                matchUpdateFailed = true;
                break;
              }
            }
            if (matchUpdateFailed) continue;

            // 2. Delete session_players for removed player
            const { error: spErr } = await supabase
              .from('session_players')
              .delete()
              .eq('player_id', op.removeId);
            if (spErr) {
              errors.push(`병합 세션 플레이어 삭제 실패: ${spErr.message} (code: ${spErr.code})`);
              continue;
            }

            // 3. Delete the removed player (verify with .select())
            const { data: deletedPlayer, error: delErr } = await supabase
              .from('players')
              .delete()
              .eq('id', op.removeId)
              .select();
            if (delErr) {
              errors.push(`병합 선수 삭제 실패: ${delErr.message} (code: ${delErr.code})`);
              continue;
            }
            if (!deletedPlayer || deletedPlayer.length === 0) {
              errors.push(`병합 선수 삭제 실패: RLS DELETE 권한 없음 (player ${op.removeId})`);
              continue;
            }
            successCount++;
            break;
          }

          case 'rename': {
            const { data: updated, error } = await supabase
              .from('players')
              .update({ name: op.newName })
              .eq('id', op.playerId)
              .select();
            if (error) { errors.push(`이름 변경 실패: ${error.message} (code: ${error.code})`); continue; }
            if (!updated || updated.length === 0) { errors.push(`이름 변경 실패: RLS UPDATE 권한 없음`); continue; }
            successCount++;
            break;
          }

          case 'delete-player': {
            // Explicitly delete session_players first (belt-and-suspenders with CASCADE)
            const { error: spErr } = await supabase
              .from('session_players')
              .delete()
              .eq('player_id', op.player.id);
            const { data: deleted, error } = await supabase
              .from('players')
              .delete()
              .eq('id', op.player.id)
              .select();
            if (error) { errors.push(`선수 삭제 실패 (${op.player.name}): ${error.message} (code: ${error.code})`); continue; }
            if (!deleted || deleted.length === 0) {
              errors.push(`선수 삭제 실패 (${op.player.name}): RLS DELETE 권한 없음 - Supabase Dashboard에서 players 테이블의 DELETE policy를 확인하세요`);
              continue;
            }
            successCount++;
            break;
          }

          case 'edit-location': {
            const { data: updated, error } = await supabase
              .from('sessions')
              .update({ location: op.newLocation || null })
              .eq('id', op.sessionId)
              .select();
            if (error) { errors.push(`장소 변경 실패: ${error.message}`); continue; }
            if (!updated || updated.length === 0) { errors.push(`장소 변경 실패: RLS UPDATE 권한 없음`); continue; }
            successCount++;
            break;
          }

          case 'delete-session': {
            const { data: deleted, error } = await supabase
              .from('sessions')
              .delete()
              .eq('id', op.session.id)
              .select();
            if (error) { errors.push(`세션 삭제 실패: ${error.message}`); continue; }
            if (!deleted || deleted.length === 0) { errors.push(`세션 삭제 실패: RLS DELETE 권한 없음`); continue; }
            successCount++;
            break;
          }

          case 'edit-score': {
            const { data: updated, error } = await supabase
              .from('matches')
              .update({ score_a: op.newScoreA, score_b: op.newScoreB })
              .eq('id', op.matchId)
              .select();
            if (error) { errors.push(`점수 변경 실패: ${error.message}`); continue; }
            if (!updated || updated.length === 0) { errors.push(`점수 변경 실패: RLS UPDATE 권한 없음`); continue; }
            successCount++;
            break;
          }

          case 'delete-match': {
            const { data: deleted, error } = await supabase
              .from('matches')
              .delete()
              .eq('id', op.match.id)
              .select();
            if (error) { errors.push(`매치 삭제 실패: ${error.message}`); continue; }
            if (!deleted || deleted.length === 0) { errors.push(`매치 삭제 실패: RLS DELETE 권한 없음`); continue; }
            successCount++;
            break;
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${op.type} 처리 중 예외: ${msg}`);
        console.error(`[Admin] Op ${op.type} exception:`, err);
      }
    }

    if (errors.length > 0) {
      const msg = `${successCount}건 성공, ${errors.length}건 실패:\n${errors.join('\n')}`;
      showToast(msg, errors.length === sortedOps.length ? 'error' : 'warning');
      // Alert as fallback so user definitely sees the error
      window.alert(msg);
    } else if (successCount > 0) {
      showToast(`${successCount}건의 변경사항이 적용되었습니다.`, 'success');
    } else {
      showToast('적용할 변경사항이 없습니다.', 'warning');
    }

    setPendingOps([]);
    await loadAllData();
    setCommitting(false);
  };

  // --- Quick Entry (immediate, not pending) ---
  const handleQuickEntry = async () => {
    if (!qeTeamA1 || !qeTeamA2 || !qeTeamB1 || !qeTeamB2) {
      showToast('Please select all 4 players', 'warning');
      return;
    }

    const selectedIds = [qeTeamA1, qeTeamA2, qeTeamB1, qeTeamB2];
    if (new Set(selectedIds).size !== 4) {
      showToast('All players must be different', 'warning');
      return;
    }

    setQeSaving(true);
    try {
      let sessionId = qeSessionId;

      if (qeUseNewSession || !sessionId) {
        const sessionPayload: { location?: string; status: string; played_at?: string } = {
          status: 'completed'
        };
        if (qeNewLocation.trim()) sessionPayload.location = qeNewLocation.trim();
        if (qeNewDate) sessionPayload.played_at = new Date(qeNewDate).toISOString();

        const { data, error } = await supabase
          .from('sessions')
          .insert(sessionPayload)
          .select('id')
          .single();
        if (error) throw error;
        sessionId = data.id;

        const sessionPlayers = selectedIds.map(pid => ({
          session_id: sessionId,
          player_id: pid
        }));
        await supabase.from('session_players').upsert(sessionPlayers, { onConflict: 'session_id,player_id' });
      }

      const matchPayload = {
        session_id: sessionId,
        played_at: qeNewDate ? new Date(qeNewDate).toISOString() : new Date().toISOString(),
        end_time: new Date().toISOString(),
        team_a: { player1Id: qeTeamA1, player2Id: qeTeamA2 },
        team_b: { player1Id: qeTeamB1, player2Id: qeTeamB2 },
        score_a: qeScoreA,
        score_b: qeScoreB,
        is_finished: true,
        court_number: 1
      };

      const { error: matchError } = await supabase.from('matches').insert(matchPayload);
      if (matchError) throw matchError;

      showToast('Match recorded successfully!', 'success');
      setQeScoreA(0);
      setQeScoreB(0);
      setQeTeamA1('');
      setQeTeamA2('');
      setQeTeamB1('');
      setQeTeamB2('');
      loadAllData();
    } catch (error) {
      console.error('Failed to save match:', error);
      showToast('Failed to save match', 'error');
    } finally {
      setQeSaving(false);
    }
  };

  const handleQeAddNewPlayer = async () => {
    if (!qeNewPlayerName.trim()) return;
    setQeAddingPlayer(true);
    try {
      const { data, error } = await supabase
        .from('players')
        .insert({ name: qeNewPlayerName.trim() })
        .select()
        .single();
      if (error) throw error;
      showToast(`${qeNewPlayerName.trim()} 추가됨`, 'success');
      setQeNewPlayerName('');
      // Lightweight players-only refresh — avoids setting loading=true which would unmount Quick Entry
      const { data: refreshed } = await supabase.from('players').select('*').order('name');
      if (refreshed) setPlayers(refreshed as AdminPlayer[]);
      // Auto-assign to the selected target team's next empty slot; deselect when full
      if (data?.id) {
        if (qeTargetTeam === 'A') {
          if (!qeTeamA1) { setQeTeamA1(data.id); if (qeTeamA2) setQeTargetTeam(null); }
          else if (!qeTeamA2) { setQeTeamA2(data.id); setQeTargetTeam(null); }
        } else if (qeTargetTeam === 'B') {
          if (!qeTeamB1) { setQeTeamB1(data.id); if (qeTeamB2) setQeTargetTeam(null); }
          else if (!qeTeamB2) { setQeTeamB2(data.id); setQeTargetTeam(null); }
        }
      }
    } catch {
      showToast('선수 추가 실패', 'error');
    } finally {
      setQeAddingPlayer(false);
    }
  };

  const handleQePlayerPillClick = (playerId: string) => {
    // If already assigned, clicking removes from that slot
    const allSlots = [qeTeamA1, qeTeamA2, qeTeamB1, qeTeamB2];
    const allSetters = [setQeTeamA1, setQeTeamA2, setQeTeamB1, setQeTeamB2];
    const idx = allSlots.indexOf(playerId);
    if (idx !== -1) { allSetters[idx](''); return; }
    // Assign to selected target team; auto-deselect team when it becomes full
    if (qeTargetTeam === 'A') {
      if (!qeTeamA1) { setQeTeamA1(playerId); if (qeTeamA2) setQeTargetTeam(null); return; }
      if (!qeTeamA2) { setQeTeamA2(playerId); setQeTargetTeam(null); return; }
      showToast('Team A is full (2/2)', 'warning');
    } else if (qeTargetTeam === 'B') {
      if (!qeTeamB1) { setQeTeamB1(playerId); if (qeTeamB2) setQeTargetTeam(null); return; }
      if (!qeTeamB2) { setQeTeamB2(playerId); setQeTargetTeam(null); return; }
      showToast('Team B is full (2/2)', 'warning');
    } else {
      showToast('TEAM A 또는 B를 먼저 선택하세요', 'warning');
    }
  };

  // Slot helpers for drag & drop
  const getQeSlotId = (slot: SlotKey): string => {
    if (slot === 'A1') return qeTeamA1;
    if (slot === 'A2') return qeTeamA2;
    if (slot === 'B1') return qeTeamB1;
    return qeTeamB2;
  };
  const setQeSlotId = (slot: SlotKey, id: string) => {
    if (slot === 'A1') setQeTeamA1(id);
    else if (slot === 'A2') setQeTeamA2(id);
    else if (slot === 'B1') setQeTeamB1(id);
    else setQeTeamB2(id);
  };
  const handleQeSlotDrop = (targetSlot: SlotKey) => {
    if (!qeDragPlayerId) return;
    const targetCurrent = getQeSlotId(targetSlot);
    if (qeDragFromSlot) {
      // Slot-to-slot: swap contents
      setQeSlotId(qeDragFromSlot, targetCurrent);
      setQeSlotId(targetSlot, qeDragPlayerId);
    } else {
      // Pill-to-slot: find if player already occupies a slot and swap, then assign
      const allSlotKeys: SlotKey[] = ['A1', 'A2', 'B1', 'B2'];
      const sourceSlot = allSlotKeys.find(s => getQeSlotId(s) === qeDragPlayerId) ?? null;
      if (sourceSlot) setQeSlotId(sourceSlot, targetCurrent);
      setQeSlotId(targetSlot, qeDragPlayerId);
    }
    setQeDragPlayerId(null);
    setQeDragFromSlot(null);
    setQeDragOverSlot(null);
  };

  const getPlayerName = (id: string) => {
    // Check pending renames first
    const renameOp = pendingOps.find(op => op.type === 'rename' && op.playerId === id);
    if (renameOp && renameOp.type === 'rename') return renameOp.newName;
    return players.find(p => p.id === id)?.name || id.substring(0, 8);
  };

  const toggleSessionExpand = (sessionId: string) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
      setMatches([]);
    } else {
      setExpandedSessionId(sessionId);
      loadSessionMatches(sessionId);
    }
  };

  const opDescription = (op: PendingOp): string => {
    switch (op.type) {
      case 'rename': return `이름 변경: "${op.oldName}" → "${op.newName}"`;
      case 'delete-player': return `선수 삭제: "${op.player.name}"`;
      case 'merge': return `병합: "${op.removeName}" → "${op.keepName}" (기록 통합)`;
      case 'edit-location': return `장소 변경: "${op.oldLocation || 'N/A'}" → "${op.newLocation || 'N/A'}"`;
      case 'delete-session': return `세션 삭제: ${new Date(op.session.played_at).toLocaleDateString('ko-KR')}`;
      case 'edit-score': return `점수 변경: ${op.oldScoreA}-${op.oldScoreB} → ${op.newScoreA}-${op.newScoreB}`;
      case 'delete-match': return `매치 삭제`;
    }
  };

  const opColor = (op: PendingOp): string => {
    switch (op.type) {
      case 'rename':
      case 'edit-location':
      case 'edit-score':
        return 'text-blue-400 border-blue-700/50 bg-blue-900/20';
      case 'delete-player':
      case 'delete-session':
      case 'delete-match':
        return 'text-red-400 border-red-700/50 bg-red-900/20';
      case 'merge':
        return 'text-purple-400 border-purple-700/50 bg-purple-900/20';
    }
  };

  // --- Login Screen ---
  if (!isAuthenticated) {
    return (
      <div className="pb-24 space-y-6">
        <div className="flex items-center gap-2 px-2">
          <button onClick={() => { onExitAdmin?.(); setTab(Tab.PLAYERS); }} className="text-slate-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <Shield size={20} className="text-tennis-green" />
          <h2 className="text-tennis-green font-bold text-lg">Admin Access</h2>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4 max-w-sm mx-auto">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-tennis-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield size={32} className="text-tennis-green" />
            </div>
            <h3 className="text-white font-bold text-lg">Admin Login</h3>
            <p className="text-slate-400 text-xs mt-1">Enter credentials to manage data</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">ID</label>
              <input
                type="text"
                value={adminId}
                onChange={e => setAdminId(e.target.value)}
                placeholder="admin"
                className="w-full mt-1 bg-slate-900 text-white p-3 rounded-lg border border-slate-600 focus:outline-none focus:border-tennis-green"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="********"
                className="w-full mt-1 bg-slate-900 text-white p-3 rounded-lg border border-slate-600 focus:outline-none focus:border-tennis-green"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>

          {authError && (
            <p className="text-red-400 text-sm text-center">{authError}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loginLoading}
            className="w-full py-3 bg-tennis-green text-slate-900 font-bold rounded-xl hover:bg-[#c0ce4e] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loginLoading && <Loader2 size={16} className="animate-spin" />}
            {loginLoading ? 'Authenticating...' : 'Login'}
          </button>

          <p className="text-[10px] text-slate-500 text-center">
            Netlify 환경변수에 ADMIN_ID, ADMIN_PASSWORD 설정 필요
          </p>
        </div>
      </div>
    );
  }

  // --- Admin Dashboard ---
  return (
    <div className="pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <button onClick={() => { onExitAdmin?.(); setTab(Tab.PLAYERS); }} className="text-slate-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <Shield size={20} className="text-tennis-green" />
          <h2 className="text-tennis-green font-bold text-lg">Admin</h2>
        </div>
        <div className="flex items-center gap-2">
          {pendingOps.length > 0 && (
            <span className="text-[10px] text-yellow-400 font-bold bg-yellow-900/30 px-2 py-0.5 rounded-full">
              {pendingOps.length} pending
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-slate-500 hover:text-red-400 border border-slate-700 px-2 py-1 rounded"
          >
            Logout
          </button>
        </div>
      </div>

      {/* RLS Diagnostic Banner */}
      {rlsDiag && (!rlsDiag.canDelete || !rlsDiag.canUpdate) && (
        <div className="mx-2 p-3 bg-red-900/30 border border-red-700/50 rounded-lg space-y-1">
          <p className="text-xs font-bold text-red-400 flex items-center gap-1">
            <AlertTriangle size={14} /> Supabase RLS 권한 문제 감지
          </p>
          <div className="flex gap-2 text-[10px]">
            <span className={rlsDiag.canSelect ? 'text-green-400' : 'text-red-400'}>SELECT: {rlsDiag.canSelect ? 'OK' : 'FAIL'}</span>
            <span className={rlsDiag.canInsert ? 'text-green-400' : 'text-red-400'}>INSERT: {rlsDiag.canInsert ? 'OK' : 'FAIL'}</span>
            <span className={rlsDiag.canUpdate ? 'text-green-400' : 'text-red-400'}>UPDATE: {rlsDiag.canUpdate ? 'OK' : 'FAIL'}</span>
            <span className={rlsDiag.canDelete ? 'text-green-400' : 'text-red-400'}>DELETE: {rlsDiag.canDelete ? 'OK' : 'FAIL'}</span>
          </div>
          {rlsDiag.error && <p className="text-[10px] text-red-300 break-all">{rlsDiag.error}</p>}
          <p className="text-[10px] text-slate-400">
            Supabase Dashboard &gt; Authentication &gt; Policies 에서 players 테이블에 DELETE/UPDATE policy를 추가하세요.
          </p>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex gap-2 px-2">
        {([
          { key: 'players' as const, label: 'Players', icon: <Users size={14} /> },
          { key: 'sessions' as const, label: 'Sessions', icon: <Calendar size={14} /> },
          { key: 'quick-entry' as const, label: 'Quick Entry', icon: <Plus size={14} /> }
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg transition-colors ${
              activeSection === tab.key
                ? 'bg-tennis-green text-slate-900'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-tennis-green" size={24} />
        </div>
      )}

      {/* ========== Players Section ========== */}
      {activeSection === 'players' && !loading && (
        <div className="space-y-3 px-2">
          <p className="text-xs text-slate-500">
            Total: {displayPlayers.length} players in database
          </p>

          {/* Duplicate name detection */}
          {duplicateGroups.length > 0 && (
            <div className="bg-purple-900/20 border border-purple-700/40 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                <Merge size={14} /> 중복 이름 감지 ({duplicateGroups.length}건)
              </div>
              {duplicateGroups.map(([name, group]) => (
                <div key={name} className="bg-slate-800/50 rounded-lg p-2 flex items-center justify-between">
                  <p className="text-xs text-purple-300 font-medium">"{group[0].name}" x {group.length}명</p>
                  <button
                    onClick={() => {
                      // Keep the first one, merge all others into it
                      group.slice(1).forEach(other => {
                        handleMergePlayers(group[0].id, other.id);
                      });
                    }}
                    className="text-[10px] px-2.5 py-1 bg-purple-700/50 text-purple-300 rounded hover:bg-purple-600/50 transition-colors font-bold"
                  >
                    {group.length}명 병합
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Player list */}
          {displayPlayers.map(player => (
            <div key={player.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700 flex items-center justify-between">
              {editingPlayerId === player.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editPlayerName}
                    onChange={e => setEditPlayerName(e.target.value)}
                    className="flex-1 bg-slate-900 text-white p-2 rounded border border-slate-600 text-sm"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenamePlayer(player.id);
                      if (e.key === 'Escape') setEditingPlayerId(null);
                    }}
                  />
                  <button onClick={() => handleRenamePlayer(player.id)} className="p-1.5 bg-tennis-green text-slate-900 rounded">
                    <Save size={14} />
                  </button>
                  <button onClick={() => setEditingPlayerId(null)} className="p-1.5 bg-slate-700 text-white rounded">
                    <X size={14} />
                  </button>
                </div>
              ) : mergeSourceId === player.id ? (
                <div className="flex-1 space-y-2">
                  <p className="text-xs text-purple-400">병합 대상 선택 (이 선수의 기록이 대상으로 이관됩니다):</p>
                  <select
                    value={mergeTargetId || ''}
                    onChange={e => setMergeTargetId(e.target.value || null)}
                    className="w-full bg-slate-900 text-white p-2 rounded border border-slate-600 text-sm"
                    autoFocus
                  >
                    <option value="">선택...</option>
                    {displayPlayers.filter(p => p.id !== player.id).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        if (mergeTargetId) handleMergePlayers(mergeTargetId, player.id);
                      }}
                      disabled={!mergeTargetId}
                      className="flex-1 text-xs py-1.5 bg-purple-600 text-white rounded font-bold disabled:opacity-50"
                    >
                      병합
                    </button>
                    <button
                      onClick={() => { setMergeSourceId(null); setMergeTargetId(null); }}
                      className="flex-1 text-xs py-1.5 bg-slate-700 text-white rounded"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-white text-sm font-medium">{player.name}</span>
                    <span className="text-[10px] text-slate-500 ml-2">{player.id.substring(0, 8)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingPlayerId(player.id); setEditPlayerName(player.name); }}
                      className="p-1.5 text-slate-500 hover:text-tennis-green"
                      title="이름 변경"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => { setMergeSourceId(player.id); setMergeTargetId(null); }}
                      className="p-1.5 text-slate-500 hover:text-purple-400"
                      title="다른 선수와 병합"
                    >
                      <Merge size={14} />
                    </button>
                    <button
                      onClick={() => handleDeletePlayer(player.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400"
                      title="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Pending changes summary for Players */}
          {currentSectionOps.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="border-t border-slate-700 pt-3">
                <p className="text-xs font-bold text-yellow-400 mb-2">
                  대기 중인 변경사항 ({currentSectionOps.length}건)
                </p>
                {currentSectionOps.map(op => (
                  <div key={op.id} className={`flex items-center justify-between p-2 rounded-lg border text-xs mb-1 ${opColor(op)}`}>
                    <span>{opDescription(op)}</span>
                    <button onClick={() => undoOp(op.id)} className="p-1 hover:text-white" title="되돌리기">
                      <Undo2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={committing}
                className="w-full py-3 bg-tennis-green text-slate-900 font-bold rounded-xl hover:bg-[#c0ce4e] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {committing ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                Done ({pendingOps.length}건 적용)
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========== Sessions Section ========== */}
      {activeSection === 'sessions' && !loading && (
        <div className="space-y-2 px-2">
          <p className="text-xs text-slate-500">
            Total: {displaySessions.length} sessions
          </p>
          {displaySessions.map(session => (
            <div key={session.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <div
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-750"
                onClick={() => toggleSessionExpand(session.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">
                      {new Date(session.played_at).toLocaleDateString('ko-KR')}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      session.status === 'active' ? 'bg-tennis-green/20 text-tennis-green' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                  {editingSessionId === session.id ? (
                    <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editSessionLocation}
                        onChange={e => setEditSessionLocation(e.target.value)}
                        placeholder="Location"
                        className="flex-1 bg-slate-900 text-white p-1 rounded border border-slate-600 text-xs"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleEditLocation(session.id);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                      />
                      <button onClick={() => handleEditLocation(session.id)} className="p-1 bg-tennis-green text-slate-900 rounded">
                        <Save size={12} />
                      </button>
                      <button onClick={() => setEditingSessionId(null)} className="p-1 bg-slate-700 text-white rounded">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {session.location || 'No location'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => { setEditingSessionId(session.id); setEditSessionLocation(session.location || ''); }}
                    className="p-1.5 text-slate-500 hover:text-tennis-green"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                  {expandedSessionId === session.id
                    ? <ChevronUp size={16} className="text-slate-400" />
                    : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded: Session Matches */}
              {expandedSessionId === session.id && (
                <div className="border-t border-slate-700 p-3 space-y-2 bg-slate-900/50">
                  {displayMatches.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-2">No matches in this session</p>
                  ) : (
                    displayMatches.map((match, idx) => (
                      <div key={match.id} className="bg-slate-800 rounded-lg p-2 border border-slate-700">
                        {editingMatchId === match.id ? (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-white">
                                {getPlayerName(match.team_a.player1Id)} & {getPlayerName(match.team_a.player2Id)}
                              </span>
                              <input
                                type="number"
                                value={editMatchScoreA}
                                onChange={e => setEditMatchScoreA(parseInt(e.target.value) || 0)}
                                className="w-12 bg-slate-900 text-white text-center rounded border border-slate-600 text-sm"
                              />
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-white">
                                {getPlayerName(match.team_b.player1Id)} & {getPlayerName(match.team_b.player2Id)}
                              </span>
                              <input
                                type="number"
                                value={editMatchScoreB}
                                onChange={e => setEditMatchScoreB(parseInt(e.target.value) || 0)}
                                className="w-12 bg-slate-900 text-white text-center rounded border border-slate-600 text-sm"
                              />
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => handleEditMatchScore(match.id)} className="flex-1 text-xs bg-tennis-green text-slate-900 py-1 rounded font-bold">
                                OK
                              </button>
                              <button onClick={() => setEditingMatchId(null)} className="flex-1 text-xs bg-slate-700 text-white py-1 rounded">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-slate-500 w-4">{idx + 1}.</span>
                                <span className={match.score_a > match.score_b ? 'text-white font-bold' : 'text-slate-400'}>
                                  {getPlayerName(match.team_a.player1Id)} & {getPlayerName(match.team_a.player2Id)}
                                </span>
                                <span className="text-sm font-mono text-white">{match.score_a}</span>
                                <span className="text-slate-600">-</span>
                                <span className="text-sm font-mono text-white">{match.score_b}</span>
                                <span className={match.score_b > match.score_a ? 'text-white font-bold' : 'text-slate-400'}>
                                  {getPlayerName(match.team_b.player1Id)} & {getPlayerName(match.team_b.player2Id)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { setEditingMatchId(match.id); setEditMatchScoreA(match.score_a); setEditMatchScoreB(match.score_b); }}
                                className="p-1 text-slate-500 hover:text-tennis-green"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteMatch(match.id)}
                                className="p-1 text-slate-500 hover:text-red-400"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Pending changes summary for Sessions */}
          {currentSectionOps.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="border-t border-slate-700 pt-3">
                <p className="text-xs font-bold text-yellow-400 mb-2">
                  대기 중인 변경사항 ({currentSectionOps.length}건)
                </p>
                {currentSectionOps.map(op => (
                  <div key={op.id} className={`flex items-center justify-between p-2 rounded-lg border text-xs mb-1 ${opColor(op)}`}>
                    <span>{opDescription(op)}</span>
                    <button onClick={() => undoOp(op.id)} className="p-1 hover:text-white" title="되돌리기">
                      <Undo2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={committing}
                className="w-full py-3 bg-tennis-green text-slate-900 font-bold rounded-xl hover:bg-[#c0ce4e] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {committing ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                Done ({pendingOps.length}건 적용)
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========== Quick Entry Section ========== */}
      {activeSection === 'quick-entry' && !loading && (
        <div className="space-y-4 px-2">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-4">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Trophy size={16} className="text-tennis-green" /> Quick Match Entry
            </h3>
            <p className="text-xs text-slate-400">
              Record a single match result directly to the database
            </p>

            {/* Session Selection */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-bold uppercase">Session</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={qeUseNewSession}
                    onChange={e => setQeUseNewSession(e.target.checked)}
                    className="rounded"
                  />
                  Create new session
                </label>
              </div>

              {qeUseNewSession ? (
                <div className="space-y-3">
                  {/* Date & Time — same style as SESSION MANAGER */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Date & Time</label>
                    <div className="relative">
                      <input
                        type="datetime-local"
                        value={qeNewDate}
                        onChange={e => setQeNewDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-tennis-green outline-none font-mono pr-8"
                      />
                      <Clock size={14} className="absolute right-2.5 top-3 text-tennis-green pointer-events-none" />
                    </div>
                  </div>
                  {/* Location — same as SESSION MANAGER */}
                  <LocationPicker
                    value={qeNewLocation}
                    onChange={setQeNewLocation}
                    loadHistory={true}
                  />
                </div>
              ) : (
                <select
                  value={qeSessionId}
                  onChange={e => setQeSessionId(e.target.value)}
                  className="w-full bg-slate-900 text-white p-2 rounded-lg border border-slate-600 text-sm"
                >
                  <option value="">Select existing session...</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.played_at).toLocaleDateString('ko-KR')} - {s.location || 'No location'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Players — Add Player style (same as Players tab) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 font-bold uppercase">Players</label>
                <button
                  type="button"
                  onClick={() => setQeShowPlayerPicker(!qeShowPlayerPicker)}
                  className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 hover:text-white transition-colors"
                >
                  {qeShowPlayerPicker ? 'Close List' : 'From Global List'}
                </button>
              </div>

              {/* Team A / Team B selection — disabled when team is full */}
              {(() => {
                const teamAFull = !!(qeTeamA1 && qeTeamA2);
                const teamBFull = !!(qeTeamB1 && qeTeamB2);
                const currentTeamFull = (qeTargetTeam === 'A' && teamAFull) || (qeTargetTeam === 'B' && teamBFull);
                return (
                  <>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => !teamAFull && setQeTargetTeam(qeTargetTeam === 'A' ? null : 'A')}
                        disabled={teamAFull}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                          teamAFull
                            ? 'bg-tennis-green/10 border-tennis-green/40 text-tennis-green/60 cursor-default'
                            : qeTargetTeam === 'A'
                            ? 'bg-tennis-green/20 border-tennis-green text-tennis-green'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-tennis-green hover:text-tennis-green'
                        }`}
                      >
                        {teamAFull ? '✓ TEAM A (완료)' : qeTargetTeam === 'A' ? '✓ TEAM A 선택중' : 'TEAM A 선택'}
                      </button>
                      <button
                        type="button"
                        onClick={() => !teamBFull && setQeTargetTeam(qeTargetTeam === 'B' ? null : 'B')}
                        disabled={teamBFull}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                          teamBFull
                            ? 'bg-orange-500/10 border-orange-500/40 text-orange-400/60 cursor-default'
                            : qeTargetTeam === 'B'
                            ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-orange-500 hover:text-orange-400'
                        }`}
                      >
                        {teamBFull ? '✓ TEAM B (완료)' : qeTargetTeam === 'B' ? '✓ TEAM B 선택중' : 'TEAM B 선택'}
                      </button>
                    </div>
                    {!qeTargetTeam && !teamAFull && !teamBFull && (
                      <p className="text-[10px] text-slate-500 text-center">팀을 선택한 후 선수를 추가할 수 있습니다</p>
                    )}
                    {currentTeamFull && (
                      <p className="text-[10px] text-tennis-green/70 text-center">이 팀은 가득 찼습니다. 다른 팀을 선택하세요.</p>
                    )}
                  </>
                );
              })()}

              {/* Global list pills */}
              {qeShowPlayerPicker && (
                <div className="bg-slate-900 rounded-lg p-2 max-h-36 overflow-y-auto border border-slate-700">
                  <p className="text-[10px] text-slate-500 mb-2 px-1">
                    {qeTargetTeam ? `탭하여 ${qeTargetTeam === 'A' ? 'Team A' : 'Team B'}에 배정 · 🟢 A팀 · 🟠 B팀` : '팀을 먼저 선택하세요'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {displayPlayers.map(p => {
                      const isTeamA = [qeTeamA1, qeTeamA2].includes(p.id);
                      const isTeamB = [qeTeamB1, qeTeamB2].includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            setQeDragPlayerId(p.id);
                            setQeDragFromSlot(null);
                          }}
                          onDragEnd={() => { setQeDragPlayerId(null); setQeDragFromSlot(null); setQeDragOverSlot(null); }}
                          onClick={() => handleQePlayerPillClick(p.id)}
                          className={`text-xs px-2 py-1 rounded border transition-colors cursor-grab active:cursor-grabbing ${
                            isTeamA
                              ? 'bg-tennis-green/20 text-tennis-green border-tennis-green'
                              : isTeamB
                              ? 'bg-orange-500/20 text-orange-400 border-orange-500'
                              : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-tennis-green hover:text-tennis-green'
                          } ${qeDragPlayerId === p.id ? 'opacity-50' : ''}`}
                        >
                          {isTeamA ? 'A· ' : isTeamB ? 'B· ' : '+ '}{p.name}
                        </button>
                      );
                    })}
                    {displayPlayers.length === 0 && (
                      <span className="text-xs text-slate-500 pl-1">선수가 없습니다</span>
                    )}
                  </div>
                </div>
              )}

              {/* Add new player inline — disabled until team selected or team full */}
              {(() => {
                const teamAFull = !!(qeTeamA1 && qeTeamA2);
                const teamBFull = !!(qeTeamB1 && qeTeamB2);
                const currentTeamFull = (qeTargetTeam === 'A' && teamAFull) || (qeTargetTeam === 'B' && teamBFull);
                const inputDisabled = !qeTargetTeam || currentTeamFull;
                return (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={qeNewPlayerName}
                      onChange={e => setQeNewPlayerName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleQeAddNewPlayer(); } }}
                      placeholder={
                        currentTeamFull ? `Team ${qeTargetTeam} 완료 (2/2)` :
                        qeTargetTeam ? `Team ${qeTargetTeam} 선수 이름...` : '팀 선택 후 입력'
                      }
                      disabled={inputDisabled}
                      className="flex-1 bg-slate-900 text-white p-2 rounded-lg border border-slate-600 text-sm focus:border-tennis-green outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={handleQeAddNewPlayer}
                      disabled={qeAddingPlayer || !qeNewPlayerName.trim() || inputDisabled}
                      className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 flex items-center gap-1 text-sm"
                    >
                      {qeAddingPlayer ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      Add
                    </button>
                  </div>
                );
              })()}

              {/* Team assignment display — draggable slots */}
              <div className="grid grid-cols-2 gap-2">
                {(['A', 'B'] as const).map(team => (
                  <div key={team}>
                    <p className={`text-xs font-bold mb-1 uppercase ${team === 'A' ? 'text-tennis-green' : 'text-orange-400'}`}>
                      Team {team}
                    </p>
                    {(['1', '2'] as const).map(pos => {
                      const slotKey = `${team}${pos}` as SlotKey;
                      const slotId = getQeSlotId(slotKey);
                      const isOver = qeDragOverSlot === slotKey;
                      const isDragging = qeDragPlayerId === slotId && !!slotId;
                      return (
                        <div
                          key={slotKey}
                          draggable={!!slotId}
                          onDragStart={slotId ? (e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            setQeDragPlayerId(slotId);
                            setQeDragFromSlot(slotKey);
                          } : undefined}
                          onDragEnd={() => { setQeDragPlayerId(null); setQeDragFromSlot(null); setQeDragOverSlot(null); }}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setQeDragOverSlot(slotKey); }}
                          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setQeDragOverSlot(null); }}
                          onDrop={(e) => { e.preventDefault(); handleQeSlotDrop(slotKey); }}
                          className={`text-xs rounded px-2 py-1.5 mb-1 flex items-center justify-between border transition-all ${
                            isDragging ? 'opacity-40' :
                            slotId
                              ? team === 'A'
                                ? 'border-tennis-green/40 bg-tennis-green/10 cursor-grab active:cursor-grabbing'
                                : 'border-orange-500/40 bg-orange-500/10 cursor-grab active:cursor-grabbing'
                              : isOver
                                ? team === 'A'
                                  ? 'border-tennis-green border-dashed bg-tennis-green/5'
                                  : 'border-orange-500 border-dashed bg-orange-500/5'
                                : 'border-slate-700 border-dashed bg-slate-900/50'
                          } ${isOver && !slotId ? 'scale-[1.02]' : ''}`}
                        >
                          <span className={slotId ? 'text-white' : `text-[10px] ${isOver ? (team === 'A' ? 'text-tennis-green' : 'text-orange-400') : 'text-slate-600'}`}>
                            {slotId
                              ? displayPlayers.find(p => p.id === slotId)?.name ?? slotId.substring(0, 8)
                              : `P${pos} — 드래그`}
                          </span>
                          {slotId && (
                            <button
                              type="button"
                              onClick={() => setQeSlotId(slotKey, '')}
                              className="text-red-400 ml-1 hover:text-red-300 leading-none"
                            >×</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Scores */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-bold uppercase">Score</label>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <span className="text-xs text-tennis-green">Team A</span>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => setQeScoreA(Math.max(0, qeScoreA - 1))}
                      className="w-8 h-8 rounded-full bg-slate-700 text-white"
                    >-</button>
                    <span className="text-2xl font-bold text-white font-mono w-8 text-center">{qeScoreA}</span>
                    <button
                      onClick={() => setQeScoreA(qeScoreA + 1)}
                      className="w-8 h-8 rounded-full bg-slate-700 text-white"
                    >+</button>
                  </div>
                </div>
                <span className="text-slate-500 font-bold text-lg mt-4">-</span>
                <div className="text-center">
                  <span className="text-xs text-orange-400">Team B</span>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => setQeScoreB(Math.max(0, qeScoreB - 1))}
                      className="w-8 h-8 rounded-full bg-slate-700 text-white"
                    >-</button>
                    <span className="text-2xl font-bold text-white font-mono w-8 text-center">{qeScoreB}</span>
                    <button
                      onClick={() => setQeScoreB(qeScoreB + 1)}
                      className="w-8 h-8 rounded-full bg-slate-700 text-white"
                    >+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleQuickEntry}
              disabled={qeSaving}
              className="w-full py-3 bg-tennis-green text-slate-900 font-bold rounded-xl hover:bg-[#c0ce4e] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {qeSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {qeSaving ? 'Saving...' : 'Save Match Result'}
            </button>
          </div>
        </div>
      )}

      {/* ========== Confirmation Modal ========== */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-sm w-full space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle size={20} />
              <h3 className="font-bold text-lg">변경사항 확인</h3>
            </div>

            <p className="text-sm text-slate-300">
              다음 {pendingOps.length}건의 변경사항을 데이터베이스에 적용합니다.
              이 작업은 되돌릴 수 없습니다.
            </p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {pendingOps.map(op => (
                <div key={op.id} className={`p-2 rounded border text-xs ${opColor(op)}`}>
                  {opDescription(op)}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleCommitAll}
                disabled={committing}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {committing ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                확인 적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

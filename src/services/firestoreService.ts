
'use server';
import { db } from '@/lib/firebase';
import type { ComicPanelData, ComicStoryInfo } from '@/types/story';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp,
  Timestamp,
  query,
  where,
} from 'firebase/firestore';

// TODO: Implement Firebase Storage for imageUrls. Storing large Data URIs in Firestore is not optimal.

const STORY_COLLECTION = 'comicStories';
const PANELS_SUBCOLLECTION = 'panels';

// --- Story Info Functions ---

export async function getStoryInfo(storyId: string): Promise<ComicStoryInfo | null> {
  const storyRef = doc(db, STORY_COLLECTION, storyId);
  const storySnap = await getDoc(storyRef);
  if (storySnap.exists()) {
    const data = storySnap.data();
    // Ensure Timestamps are correctly handled if they are not automatically converted
    return {
        id: storySnap.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
      } as ComicStoryInfo;
  }
  return null;
}

export async function createOrUpdateStoryInfo(storyId: string, data: Partial<Omit<ComicStoryInfo, 'id' | 'updatedAt' | 'createdAt'>>): Promise<void> {
  const storyRef = doc(db, STORY_COLLECTION, storyId);
  const storySnap = await getDoc(storyRef);

  if (storySnap.exists()) {
    await updateDoc(storyRef, { ...data, updatedAt: serverTimestamp() });
  } else {
    await setDoc(storyRef, { 
        title: data.title || `Story ${storyId}`,
        rootPanelId: data.rootPanelId !== undefined ? data.rootPanelId : null,
        lastInitialPanelId: data.lastInitialPanelId !== undefined ? data.lastInitialPanelId : null,
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp() 
    });
  }
}


// --- Panel Functions ---

function sanitizePanelForFirestore(panel: ComicPanelData): Omit<ComicPanelData, 'createdAt'> & { createdAt?: Timestamp } {
    const { createdAt, ...rest } = panel;
    const firestorePanel: Omit<ComicPanelData, 'createdAt'> & { createdAt?: Timestamp } = { ...rest };
    if (createdAt && !(createdAt instanceof Timestamp)) {
      firestorePanel.createdAt = Timestamp.fromDate(new Date(createdAt));
    } else if (createdAt instanceof Timestamp) {
      firestorePanel.createdAt = createdAt;
    } else {
      firestorePanel.createdAt = serverTimestamp() as Timestamp; // Firestore will set this on creation
    }
    return firestorePanel;
}

export async function getPanelsForStory(storyId: string): Promise<ComicPanelData[]> {
  const panelsColRef = collection(db, STORY_COLLECTION, storyId, PANELS_SUBCOLLECTION);
  const panelsSnap = await getDocs(panelsColRef);
  return panelsSnap.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
    } as ComicPanelData;
  });
}

export async function addPanelToDb(storyId: string, panel: ComicPanelData): Promise<void> {
  const panelRef = doc(db, STORY_COLLECTION, storyId, PANELS_SUBCOLLECTION, panel.id);
  await setDoc(panelRef, sanitizePanelForFirestore(panel));
  await updateDoc(doc(db, STORY_COLLECTION, storyId), { updatedAt: serverTimestamp() });
}

export async function addComicBookToDb(storyId: string, groupPanel: ComicPanelData, pagePanels: ComicPanelData[]): Promise<void> {
  const batch = writeBatch(db);
  const groupPanelRef = doc(db, STORY_COLLECTION, storyId, PANELS_SUBCOLLECTION, groupPanel.id);
  batch.set(groupPanelRef, sanitizePanelForFirestore(groupPanel));

  pagePanels.forEach(page => {
    const pageRef = doc(db, STORY_COLLECTION, storyId, PANELS_SUBCOLLECTION, page.id);
    batch.set(pageRef, sanitizePanelForFirestore(page));
  });
  
  batch.update(doc(db, STORY_COLLECTION, storyId), { updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function updatePanelInDb(storyId: string, panelId: string, updates: Partial<ComicPanelData>): Promise<void> {
  const panelRef = doc(db, STORY_COLLECTION, storyId, PANELS_SUBCOLLECTION, panelId);
  const { createdAt, ...restUpdates } = updates; // Exclude createdAt from direct updates if it's a Date object
  
  const firestoreUpdates: Partial<Omit<ComicPanelData, 'createdAt'>> & { createdAt?: Timestamp } = {...restUpdates};

  if (createdAt instanceof Date) {
    firestoreUpdates.createdAt = Timestamp.fromDate(createdAt);
  } else if (createdAt instanceof Timestamp) {
    firestoreUpdates.createdAt = createdAt;
  }
  // If createdAt is not provided or is undefined, it won't be updated, which is usually correct for updates.

  await updateDoc(panelRef, firestoreUpdates);
  await updateDoc(doc(db, STORY_COLLECTION, storyId), { updatedAt: serverTimestamp() });
}

export async function updatePanelChildrenInDb(storyId: string, panelId: string, childrenIds: string[]): Promise<void> {
  const panelRef = doc(db, STORY_COLLECTION, storyId, PANELS_SUBCOLLECTION, panelId);
  await updateDoc(panelRef, { childrenIds });
  await updateDoc(doc(db, STORY_COLLECTION, storyId), { updatedAt: serverTimestamp() });
}


export async function resetStoryInDb(storyId: string): Promise<void> {
  const panelsColRef = collection(db, STORY_COLLECTION, storyId, PANELS_SUBCOLLECTION);
  const panelsSnap = await getDocs(panelsColRef);
  
  const batch = writeBatch(db);
  panelsSnap.docs.forEach(docSnap => {
    batch.delete(docSnap.ref);
  });
  
  const storyRef = doc(db, STORY_COLLECTION, storyId);
  batch.update(storyRef, {
    rootPanelId: null,
    lastInitialPanelId: null,
    updatedAt: serverTimestamp(),
  });
  
  await batch.commit();
}

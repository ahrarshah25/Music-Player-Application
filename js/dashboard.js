console.log("JS Connected - Dashboard Loaded!");

import { createAppwriteClient } from "./appwriteClient.js";
import { ID, Query } from "https://cdn.jsdelivr.net/npm/appwrite@15.0.0/+esm";

let currentUser = null;
let currentSession = null;
let selectedPlaylistId = null;
let selectedSongs = new Set();

const loadUserData = async () => {
    const { auth, client, database } = await createAppwriteClient();

    try {
        const user = await auth.get();
        currentUser = user;
        currentSession = await auth.getSession('current');

        document.getElementById('welcomeName').textContent = user.name;
        document.getElementById('userNameDisplay').textContent = user.name;
        document.getElementById('userEmailDisplay').textContent = user.email;
        document.getElementById('profileName').textContent = user.name;
        document.getElementById('profileEmail').textContent = user.email;
        document.getElementById('updateName').value = user.name;
        document.getElementById('updateEmail').value = user.email;

        const joinDate = new Date(user.$createdAt).toLocaleDateString();
        document.getElementById('joinDate').textContent = joinDate;

        await loadDashboardStats();
        await loadLikedSongs();
        await loadPlaylists();
        await loadRecentSongs();

    } catch (error) {
        console.error("Error loading user data:", error);
        window.location.href = 'login.html';
    }
};

const loadDashboardStats = async () => {
    const { database } = await createAppwriteClient();

    try {
        const likedSongs = await database.listDocuments('music', 'liked', [
            Query.equal('userId', currentUser.$id)
        ]);

        const playlists = await database.listDocuments('music', 'playlists', [
            Query.equal('userId', currentUser.$id)
        ]);

        let totalSongs = 0;
        for (const playlist of playlists.documents) {
            totalSongs += playlist.songs?.length || 0;
        }

        document.getElementById('likedCount').textContent = likedSongs.total;
        document.getElementById('playlistCount').textContent = playlists.total;
        document.getElementById('totalSongs').textContent = totalSongs;
        document.getElementById('listeningTime').textContent = Math.floor(totalSongs * 3.5 / 60);

    } catch (error) {
        console.error("Error loading stats:", error);
    }
};

const loadRecentSongs = async () => {
    const { database } = await createAppwriteClient();
    const container = document.getElementById('recentSongs');

    try {
        const recent = await database.listDocuments('music', 'history', [
            Query.equal('userId', currentUser.$id),
            Query.orderDesc('$createdAt'),
            Query.limit(4)
        ]);

        if (recent.total === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <h3>No Recent Songs</h3>
                    <p>Start listening to see your history here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recent.documents.map(song => `
            <div class="recent-song" data-id="${song.songId}">
                <div class="song-cover">
                    <i class="fas fa-music"></i>
                </div>
                <div class="song-info">
                    <h4>${song.title || 'Unknown Song'}</h4>
                    <p>${song.artist || 'Unknown Artist'}</p>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error("Error loading recent songs:", error);
    }
};

const loadLikedSongs = async () => {
    const { database } = await createAppwriteClient();
    const container = document.getElementById('likedSongsList');

    try {
        const likedSongs = await database.listDocuments('music', 'liked', [
            Query.equal('userId', currentUser.$id),
            Query.orderDesc('$createdAt')
        ]);

        if (likedSongs.total === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-heart"></i>
                    <h3>No Liked Songs Yet</h3>
                    <p>Start browsing and like some songs!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = likedSongs.documents.map(song => `
            <div class="song-item" data-id="${song.$id}">
                <div class="song-item-content">
                    <div class="song-cover">
                        <i class="fas fa-music"></i>
                    </div>
                    <div>
                        <div class="song-item-title">${song.title || 'Unknown Song'}</div>
                        <div class="song-item-artist">${song.artist || 'Unknown Artist'}</div>
                    </div>
                </div>
                <div class="song-item-actions">
                    <button class="action-icon play-song" data-id="${song.songId}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="action-icon unlike-song" data-id="${song.$id}">
                        <i class="fas fa-heart" style="color: var(--primary-color);"></i>
                    </button>
                </div>
            </div>
        `).join('');

        attachLikedSongEvents();

    } catch (error) {
        console.error("Error loading liked songs:", error);
    }
};

const searchSongs = async (query) => {
    const container = document.getElementById('searchResults');

    if (!query.trim()) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Search for Songs</h3>
                <p>Enter a song name above to start browsing</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-spinner fa-spin"></i>
            <h3>Searching...</h3>
            <p>Looking for "${query}"</p>
        </div>
    `;

    try {
        const encodedQuery = encodeURIComponent(query);
        const searchUrl = `https://youtube.com/results?search_query=${encodedQuery}`;

        const songs = await simulateYoutubeSearch(query);

        container.innerHTML = songs.map((song, index) => `
            <div class="song-result" data-id="search-${index}">
                <div class="song-details">
                    <div class="song-title">${song.title}</div>
                    <div class="song-artist">${song.artist}</div>
                    <div class="song-source">Source: ${song.source}</div>
                </div>
                <div class="song-actions">
                    <button class="action-icon play-search-song" data-index="${index}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="action-icon like-search-song" data-index="${index}">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="action-icon add-to-playlist" data-index="${index}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `).join('');

        attachSearchEvents(songs);

    } catch (error) {
        console.error("Error searching songs:", error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Search Failed</h3>
                <p>Unable to search for songs. Please try again.</p>
            </div>
        `;
    }
};

const simulateYoutubeSearch = async (query) => {
    return [
        {
            id: `song-${Date.now()}-1`,
            title: `${query} - Original Mix`,
            artist: "Various Artists",
            source: "YouTube",
            url: `https://youtube.com/watch?v=${Math.random().toString(36).substr(2)}`
        },
        {
            id: `song-${Date.now()}-2`,
            title: `${query} (Official Video)`,
            artist: "Popular Artist",
            source: "YouTube",
            url: `https://youtube.com/watch?v=${Math.random().toString(36).substr(2)}`
        },
        {
            id: `song-${Date.now()}-3`,
            title: `${query} - Acoustic Version`,
            artist: "Independent Artist",
            source: "YouTube",
            url: `https://youtube.com/watch?v=${Math.random().toString(36).substr(2)}`
        },
        {
            id: `song-${Date.now()}-4`,
            title: `${query} Remix`,
            artist: "DJ Producer",
            source: "YouTube",
            url: `https://youtube.com/watch?v=${Math.random().toString(36).substr(2)}`
        },
        {
            id: `song-${Date.now()}-5`,
            title: `${query} Live Performance`,
            artist: "Band Name",
            source: "YouTube",
            url: `https://youtube.com/watch?v=${Math.random().toString(36).substr(2)}`
        }
    ];
};

const likeSong = async (songData) => {
    const { database } = await createAppwriteClient();

    try {
        const existing = await database.listDocuments('music', 'liked', [
            Query.equal('userId', currentUser.$id),
            Query.equal('songId', songData.id)
        ]);

        if (existing.total > 0) {
            Swal.fire({
                title: "Already Liked!",
                text: "This song is already in your liked songs.",
                icon: "info"
            });
            return;
        }

        await database.createDocument('music', 'liked', ID.unique(), {
            userId: currentUser.$id,
            songId: songData.id,
            title: songData.title,
            artist: songData.artist,
            source: songData.source,
            url: songData.url
        });

        Swal.fire({
            title: "Success!",
            text: "Song added to liked songs.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false
        });

        await loadLikedSongs();
        await loadDashboardStats();

    } catch (error) {
        console.error("Error liking song:", error);
        Swal.fire({
            title: "Error!",
            text: "Failed to like song. Please try again.",
            icon: "error"
        });
    }
};

const unlikeSong = async (likeId) => {
    const { database } = await createAppwriteClient();

    try {
        await database.deleteDocument('music', 'liked', likeId);

        await loadLikedSongs();
        await loadDashboardStats();

    } catch (error) {
        console.error("Error unliking song:", error);
    }
};

const loadPlaylists = async () => {
    const { database } = await createAppwriteClient();
    const container = document.getElementById('playlistsGrid');

    try {
        const playlists = await database.listDocuments('music', 'playlists', [
            Query.equal('userId', currentUser.$id),
            Query.orderDesc('$createdAt')
        ]);

        if (playlists.total === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-list"></i>
                    <h3>No Playlists Yet</h3>
                    <p>Create your first playlist to get started!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = playlists.documents.map(playlist => `
            <div class="playlist-card ${selectedPlaylistId === playlist.$id ? 'selected' : ''}" 
                 data-id="${playlist.$id}">
                <div class="playlist-header">
                    <div class="playlist-icon">
                        <i class="fas fa-list"></i>
                    </div>
                    <div class="playlist-info">
                        <h3>${playlist.name}</h3>
                        <p>${playlist.description || 'No description'}</p>
                    </div>
                </div>
                <div class="playlist-stats">
                    <span>${playlist.songs?.length || 0} songs</span>
                    <span>Created: ${new Date(playlist.$createdAt).toLocaleDateString()}</span>
                </div>
                <div class="playlist-actions">
                    <button class="playlist-action-btn edit-playlist" data-id="${playlist.$id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="playlist-action-btn delete-playlist" data-id="${playlist.$id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        attachPlaylistEvents();

    } catch (error) {
        console.error("Error loading playlists:", error);
    }
};

const createPlaylist = async (name, description) => {
    const { database } = await createAppwriteClient();

    try {
        await database.createDocument('music', 'playlists', ID.unique(), {
            userId: currentUser.$id,
            name: name,
            description: description,
            songs: JSON.stringify([])
        });


        Swal.fire({
            title: "Success!",
            text: "Playlist created successfully.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false
        });

        await loadPlaylists();
        await loadDashboardStats();

    } catch (error) {
        console.error("Error creating playlist:", error);
        Swal.fire({
            title: "Error!",
            text: "Failed to create playlist. Please try again.",
            icon: "error"
        });
    }
};

const loadPlaylistSongs = async (playlistId) => {
    const { database } = await createAppwriteClient();
    const container = document.getElementById('playlistSongsList');

    try {
        const playlist = await database.getDocument('music', 'playlists', playlistId);
        selectedPlaylistId = playlistId;

        document.getElementById('selectedPlaylistTitle').textContent = playlist.name;

        if (!playlist.songs || playlist.songs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-music"></i>
                    <h3>No Songs in Playlist</h3>
                    <p>Add songs to this playlist to see them here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = playlist.songs.map((song, index) => `
            <div class="song-item" data-id="${song.id}">
                <div class="song-item-content">
                    <input type="checkbox" class="song-item-checkbox" data-id="${song.id}">
                    <div class="song-cover">
                        <i class="fas fa-music"></i>
                    </div>
                    <div>
                        <div class="song-item-title">${song.title}</div>
                        <div class="song-item-artist">${song.artist}</div>
                    </div>
                </div>
                <div class="song-item-actions">
                    <button class="action-icon play-song" data-id="${song.id}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="action-icon remove-from-playlist" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        attachPlaylistSongEvents(playlist);

        document.getElementById('removeSongBtn').style.display = 'block';

    } catch (error) {
        console.error("Error loading playlist songs:", error);
    }
};

const addSongToPlaylist = async (playlistId, songData) => {
    const { database } = await createAppwriteClient();

    try {
        const playlist = await database.getDocument('music', 'playlists', playlistId);
        const songsArray = playlist.songs ? playlist.songs.split(',') : [];
        if (!songsArray.includes(songData.id)) songsArray.push(songData.id);

        const existingSong = songsArray.find(song => song.id === songData.id);
        if (existingSong) {
            Swal.fire({
                title: "Already Added!",
                text: "This song is already in the playlist.",
                icon: "info"
            });
            return;
        }
        songsArray.push(songData);

        await database.updateDocument('music', 'playlists', playlistId, {
            songs: songsArray.join(',')
        });



        Swal.fire({
            title: "Success!",
            text: "Song added to playlist.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false
        });

        if (selectedPlaylistId === playlistId) {
            await loadPlaylistSongs(playlistId);
        }

        await loadDashboardStats();

    } catch (error) {
        console.error("Error adding song to playlist:", error);
        Swal.fire({
            title: "Error!",
            text: "Failed to add song to playlist: " + error,
            icon: "error"
        });
    }
};


const removeSongsFromPlaylist = async () => {
    if (selectedSongs.size === 0 || !selectedPlaylistId) return;

    const { database } = await createAppwriteClient();

    try {
        const playlist = await database.getDocument('music', 'playlists', selectedPlaylistId);
        const updatedSongs = playlist.songs?.filter((song, index) => !selectedSongs.has(song.id)) || [];

        await database.updateDocument('music', 'playlists', selectedPlaylistId, {
            songs: updatedSongs
        });

        selectedSongs.clear();
        await loadPlaylistSongs(selectedPlaylistId);
        await loadDashboardStats();

    } catch (error) {
        console.error("Error removing songs:", error);
    }
};

const updateProfile = async () => {
    const { auth } = await createAppwriteClient();
    const name = document.getElementById('updateName').value.trim();
    const email = document.getElementById('updateEmail').value.trim();

    if (!name || !email) {
        Swal.fire({
            title: "Error!",
            text: "Name and email are required.",
            icon: "error"
        });
        return;
    }

    try {
        await auth.updateName(name);

        Swal.fire({
            title: "Success!",
            text: "Profile updated successfully.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false
        });

        await loadUserData();

    } catch (error) {
        console.error("Error updating profile:", error);
        Swal.fire({
            title: "Errors!",
            text: error.message,
            icon: "error"
        });
    }
};

const attachSearchEvents = (songs) => {
    document.querySelectorAll('.play-search-song').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.target.closest('button').dataset.index;
            const song = songs[index];
            playSong(song);
        });
    });

    document.querySelectorAll('.like-search-song').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.target.closest('button').dataset.index;
            const song = songs[index];
            likeSong(song);
        });
    });

    document.querySelectorAll('.add-to-playlist').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.target.closest('button').dataset.index;
            const song = songs[index];
            showAddToPlaylistModal(song);
        });
    });
};

const attachLikedSongEvents = () => {
    document.querySelectorAll('.unlike-song').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const likeId = e.target.closest('button').dataset.id;
            unlikeSong(likeId);
        });
    });

    document.querySelectorAll('.play-song').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const songId = e.target.closest('button').dataset.id;
            playSong({ id: songId });
        });
    });
};

const attachPlaylistEvents = () => {
    document.querySelectorAll('.playlist-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.playlist-actions')) {
                const playlistId = e.currentTarget.dataset.id;
                loadPlaylistSongs(playlistId);

                document.querySelectorAll('.playlist-card').forEach(c => {
                    c.classList.remove('selected');
                });
                e.currentTarget.classList.add('selected');
            }
        });
    });

    document.querySelectorAll('.edit-playlist').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const playlistId = e.target.closest('button').dataset.id;
            const playlist = await getPlaylist(playlistId);

            Swal.fire({
                title: "Edit Playlist",
                html: `
                    <input type="text" id="editName" class="swal2-input" placeholder="Playlist Name" value="${playlist.name}">
                    <textarea id="editDescription" class="swal2-textarea" placeholder="Description">${playlist.description || ''}</textarea>
                `,
                showCancelButton: true,
                confirmButtonText: "Save",
                preConfirm: () => {
                    return {
                        name: document.getElementById('editName').value,
                        description: document.getElementById('editDescription').value
                    };
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    await updatePlaylist(playlistId, result.value);
                }
            });
        });
    });

    document.querySelectorAll('.delete-playlist').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const playlistId = e.target.closest('button').dataset.id;

            Swal.fire({
                title: "Delete Playlist?",
                text: "This action cannot be undone.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#d33",
                confirmButtonText: "Delete"
            }).then(async (result) => {
                if (result.isConfirmed) {
                    await deletePlaylist(playlistId);
                }
            });
        });
    });
};

const attachPlaylistSongEvents = (playlist) => {
    document.querySelectorAll('.song-item-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const songId = e.target.dataset.id;
            if (e.target.checked) {
                selectedSongs.add(songId);
            } else {
                selectedSongs.delete(songId);
            }
        });
    });

    document.querySelectorAll('.remove-from-playlist').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const index = e.target.closest('button').dataset.index;
            await removeSongFromPlaylistByIndex(selectedPlaylistId, index);
        });
    });
};

const removeSongFromPlaylistByIndex = async (playlistId, index) => {
    const { database } = await createAppwriteClient();

    try {
        const playlist = await database.getDocument('music', 'playlists', playlistId);
        const songs = [...playlist.songs];
        songs.splice(index, 1);

        await database.updateDocument('music', 'playlists', playlistId, {
            songs: songs
        });

        await loadPlaylistSongs(playlistId);
        await loadDashboardStats();

    } catch (error) {
        console.error("Error removing song:", error);
    }
};

const getPlaylist = async (playlistId) => {
    const { database } = await createAppwriteClient();
    return await database.getDocument('music', 'playlists', playlistId);
};

const updatePlaylist = async (playlistId, data) => {
    const { database } = await createAppwriteClient();

    try {
        await database.updateDocument('music', 'playlists', playlistId, data);
        await loadPlaylists();

        Swal.fire({
            title: "Success!",
            text: "Playlist updated.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false
        });

    } catch (error) {
        console.error("Error updating playlist:", error);
    }
};

const deletePlaylist = async (playlistId) => {
    const { database } = await createAppwriteClient();

    try {
        await database.deleteDocument('music', 'playlists', playlistId);
        await loadPlaylists();
        await loadDashboardStats();

        if (selectedPlaylistId === playlistId) {
            selectedPlaylistId = null;
            document.getElementById('playlistSongsList').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-music"></i>
                    <h3>No Playlist Selected</h3>
                    <p>Select a playlist to view its songs</p>
                </div>
            `;
            document.getElementById('selectedPlaylistTitle').textContent = 'Select a Playlist';
        }

        Swal.fire({
            title: "Deleted!",
            text: "Playlist has been deleted.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false
        });

    } catch (error) {
        console.error("Error deleting playlist:", error);
    }
};

const showAddToPlaylistModal = async (songData) => {
    const { database } = await createAppwriteClient();

    database.listDocuments('music', 'playlists', [
        Query.equal('userId', currentUser.$id)
    ]).then(playlists => {
        if (playlists.total === 0) {
            Swal.fire({
                title: "No Playlists",
                text: "Please create a playlist first.",
                icon: "info"
            });
            return;
        }

        const options = playlists.documents.map(p => `<option value="${p.$id}">${p.name}</option>`).join('');

        Swal.fire({
            title: "Add to Playlist",
            html: `
                <select id="selectPlaylist" class="swal2-select">
                    ${options}
                </select>
            `,
            showCancelButton: true,
            confirmButtonText: "Add",
            preConfirm: () => {
                return document.getElementById('selectPlaylist').value;
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                await addSongToPlaylist(result.value, songData);
            }
        });
    });
};

const playSong = (song) => {
    const playingCover = document.querySelector('.playing-cover');
    const playingTitle = document.querySelector('.playing-info h4');
    const playingArtist = document.querySelector('.playing-info p');

    playingTitle.textContent = song.title || 'Unknown Song';
    playingArtist.textContent = song.artist || 'Unknown Artist';

    Swal.fire({
        title: "Now Playing",
        text: `${song.title} - ${song.artist}`,
        icon: "info",
        timer: 1500,
        showConfirmButton: false
    });

    saveToHistory(song);
};

const saveToHistory = async (song) => {
    const { database } = await createAppwriteClient();

    try {
        await database.createDocument('music', 'history', ID.unique(), {
            userId: currentUser.$id,
            songId: song.id,
            title: song.title,
            artist: song.artist
        });

        await loadRecentSongs();

    } catch (error) {
        console.error("Error saving to history:", error);
    }
};

const logout = async () => {
    const { auth } = await createAppwriteClient();

    try {
        await auth.deleteSession('current');
        window.location.href = 'login.html';
    } catch (error) {
        console.error("Error logging out:", error);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadUserData();

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;

            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`${section}-section`).classList.add('active');
        });
    });

    document.getElementById('menuToggle').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('collapsed');
    });

    document.getElementById('searchBtn').addEventListener('click', () => {
        const query = document.getElementById('songSearch').value.trim();
        if (query) searchSongs(query);
    });

    document.getElementById('songSearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query) searchSongs(query);
        }
    });

    document.getElementById('likedSearch').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('#likedSongsList .song-item').forEach(item => {
            const title = item.querySelector('.song-item-title').textContent.toLowerCase();
            const artist = item.querySelector('.song-item-artist').textContent.toLowerCase();
            item.style.display = (title.includes(query) || artist.includes(query)) ? '' : 'none';
        });
    });

    document.getElementById('playlistSongSearch').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('#playlistSongsList .song-item').forEach(item => {
            const title = item.querySelector('.song-item-title').textContent.toLowerCase();
            const artist = item.querySelector('.song-item-artist').textContent.toLowerCase();
            item.style.display = (title.includes(query) || artist.includes(query)) ? '' : 'none';
        });
    });

    document.getElementById('clearLiked').addEventListener('click', () => {
        Swal.fire({
            title: "Clear All Liked Songs?",
            text: "This will remove all songs from your liked list.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            confirmButtonText: "Clear All"
        }).then(async (result) => {
            if (result.isConfirmed) {
                await clearAllLikedSongs();
            }
        });
    });

    document.getElementById('removeSongBtn').addEventListener('click', () => {
        Swal.fire({
            title: "Remove Selected Songs?",
            text: `Remove ${selectedSongs.size} song(s) from playlist?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            confirmButtonText: "Remove"
        }).then(async (result) => {
            if (result.isConfirmed) {
                await removeSongsFromPlaylist();
            }
        });
    });

    document.getElementById('newPlaylistBtn').addEventListener('click', () => {
        document.getElementById('modalOverlay').classList.add('active');
    });

    document.getElementById('createPlaylistModalBtn').addEventListener('click', async () => {
        const name = document.getElementById('playlistName').value.trim();
        const description = document.getElementById('playlistDescription').value.trim();

        if (!name) {
            Swal.fire({
                title: "Error!",
                text: "Playlist name is required.",
                icon: "error"
            });
            return;
        }

        await createPlaylist(name, description);
        document.getElementById('modalOverlay').classList.remove('active');
        document.getElementById('playlistName').value = '';
        document.getElementById('playlistDescription').value = '';
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('modalOverlay').classList.remove('active');
        });
    });

    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modalOverlay')) {
            document.getElementById('modalOverlay').classList.remove('active');
        }
    });

    document.getElementById('saveProfileBtn').addEventListener('click', updateProfile);

    document.getElementById('cancelUpdateBtn').addEventListener('click', () => {
        document.getElementById('updateName').value = currentUser.name;
        document.getElementById('updateEmail').value = currentUser.email;
    });

    document.getElementById('deleteAccountBtn').addEventListener('click', () => {
        Swal.fire({
            title: "Delete Account?",
            text: "This will permanently delete your account and all data.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            confirmButtonText: "Delete Account",
            input: "password",
            inputPlaceholder: "Enter your password to confirm",
            inputAttributes: {
                autocapitalize: "off",
                autocorrect: "off"
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                await deleteAccount(result.value);
            }
        });
    });

    document.getElementById('uploadAvatarBtn').addEventListener('click', () => {
        document.getElementById('avatarInput').click();
    });

    document.getElementById('avatarInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const avatarPreview = document.getElementById('avatarPreview');
                avatarPreview.innerHTML = `<img src="${e.target.result}" alt="Profile">`;
            };
            reader.readAsDataURL(file);

            Swal.fire({
                title: "Success!",
                text: "Profile picture updated (simulated).",
                icon: "success",
                timer: 1500,
                showConfirmButton: false
            });
        }
    });

    document.querySelector('.logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    document.getElementById('createPlaylistBtn').addEventListener('click', () => {
        document.querySelector('[data-section="playlists"]').click();
        document.getElementById('modalOverlay').classList.add('active');
    });

    document.getElementById('browseSongsBtn').addEventListener('click', () => {
        document.querySelector('[data-section="browse"]').click();
    });
});

const clearAllLikedSongs = async () => {
    const { database } = await createAppwriteClient();

    try {
        const likedSongs = await database.listDocuments('music', 'liked', [
            Query.equal('userId', currentUser.$id)
        ]);

        for (const song of likedSongs.documents) {
            await database.deleteDocument('music', 'liked', song.$id);
        }

        await loadLikedSongs();
        await loadDashboardStats();

        Swal.fire({
            title: "Cleared!",
            text: "All liked songs have been removed.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false
        });

    } catch (error) {
        console.error("Error clearing liked songs:", error);
    }
};

const deleteAccount = async (password) => {
    const { auth } = await createAppwriteClient();

    try {
        await auth.delete();
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Error deleting account:", error);
        Swal.fire({
            title: "Error!",
            text: "Failed to delete account. Please try again.",
            icon: "error"
        });
    }
};
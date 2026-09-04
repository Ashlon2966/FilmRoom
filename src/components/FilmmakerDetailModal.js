import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function FilmmakerDetailModal({ visible, filmmaker, onClose, onSendPitch }) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('Showreel'); // 'Showreel' | 'Stills & Posters' | 'Equipment Kit' | 'Credits & Accolades'

  if (!filmmaker) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={[styles.modalSheet, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
          {/* Close Icon */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Header / Avatar Block */}
            <View style={styles.profileHeader}>
              {filmmaker.avatar ? (
                <Image source={{ uri: filmmaker.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.avatarInitial, { color: theme.primary }]}>
                    {filmmaker.name ? filmmaker.name[0] : 'M'}
                  </Text>
                </View>
              )}

              <View style={styles.titleCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={[styles.name, { color: theme.text }]}>{filmmaker.name}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: '#2a2215' }]}>
                    <Text style={[styles.roleText, { color: theme.primary }]}>{filmmaker.role}</Text>
                  </View>
                </View>
                <Text style={[styles.metaSub, { color: theme.textSecondary }]}>
                  @{filmmaker.username} • 📍 {filmmaker.location} • {filmmaker.experience || '10+ Yrs Experience'}
                </Text>
              </View>
            </View>

            {/* Pitch Button */}
            <TouchableOpacity
              style={[styles.pitchBtn, { backgroundColor: theme.primary }]}
              onPress={onSendPitch}
            >
              <Text style={styles.pitchBtnText}>🚀 Send Direct Pitch</Text>
            </TouchableOpacity>

            {/* Bio */}
            <Text style={[styles.bio, { color: theme.text }]}>{filmmaker.bio}</Text>

            {/* Union & Rate Line */}
            <Text style={[styles.rateContract, { color: theme.primary }]}>
              Primary Focus: <Text style={{ color: theme.textSecondary }}>{filmmaker.focus || 'Psychological Thriller, Neo-Noir'}</Text> • {filmmaker.contractType || 'DGA Scale / Production Contract'}
            </Text>

            {/* 4 Tabs Bar matching Web Design */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
              {['Showreel', 'Stills & Posters', 'Equipment Kit', 'Credits & Accolades'].map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tabItem, isActive && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text style={[styles.tabText, { color: isActive ? theme.primary : theme.textMuted }]}>
                      {tab}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Tab Contents */}
            {activeTab === 'Showreel' && (
              <View style={styles.tabContent}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {filmmaker.reelTitle || 'Director Narrative Sizzle Reel'}
                </Text>
                <View style={[styles.reelMockPlayer, { backgroundColor: '#000000', borderColor: theme.cardBorder }]}>
                  <Text style={{ fontSize: 40 }}>🎬</Text>
                  <Text style={{ color: '#ffffff', marginTop: 8, fontWeight: '700' }}>Preview Video Master</Text>
                </View>
              </View>
            )}

            {activeTab === 'Stills & Posters' && (
              <View style={styles.tabContent}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Production Posters & Stills</Text>
                <View style={[styles.itemBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.itemHeading, { color: theme.text }]}>Threshold of Midnight</Text>
                  <Text style={[styles.itemSub, { color: theme.primary }]}>Feature Film (A24 / Neon style)</Text>
                  <Text style={[styles.itemDesc, { color: theme.textSecondary }]}>
                    Directorial debut premiered at SXSW. A gripping two-hander inside an interrogation suite.
                  </Text>
                </View>
              </View>
            )}

            {activeTab === 'Equipment Kit' && (
              <View style={styles.tabContent}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Owned Production Gear & Camera Packages</Text>
                {(filmmaker.equipment || [
                  'Arri Director Viewfinder with PL Mount',
                  'Teradek Cine 7 Handheld Wireless Monitor Kit',
                  'Final Draft 13 / Scrivener Screenwriting Suite',
                ]).map((item, idx) => (
                  <View key={idx} style={[styles.gearItem, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Text style={{ color: theme.primary, marginRight: 8 }}>✔</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.gearName, { color: theme.text }]}>{item}</Text>
                      <Text style={[styles.gearSub, { color: theme.textMuted }]}>FLIGHT CASE & INSURED</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'Credits & Accolades' && (
              <View style={styles.tabContent}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Notable Film, TV & Commercial Credits</Text>
                {(filmmaker.credits || [
                  { title: 'Threshold of Midnight (2024)', type: 'Narrative Feature' },
                  { title: 'Dead Reckoning (2021)', type: 'Narrative Feature' },
                  { title: 'Static (Short, 2019)', type: 'Narrative Short' },
                ]).map((c, i) => (
                  <View key={i} style={[styles.creditRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.creditTitle, { color: theme.text }]}>{c.title}</Text>
                    <Text style={[styles.creditType, { color: theme.textMuted }]}>{c.type}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1f242d',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  titleCol: { flex: 1 },
  name: { fontSize: 18, fontWeight: '900' },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  roleText: { fontSize: 10, fontWeight: '700' },
  metaSub: { fontSize: 11, marginTop: 4 },
  pitchBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 12,
  },
  pitchBtnText: { color: '#000000', fontSize: 13, fontWeight: '900' },
  bio: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  rateContract: { fontSize: 11, fontWeight: 'bold', marginBottom: 16 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#222', marginBottom: 16 },
  tabItem: { paddingVertical: 8, paddingHorizontal: 12, marginRight: 8 },
  tabText: { fontSize: 13, fontWeight: '700' },
  tabContent: { marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
  reelMockPlayer: {
    height: 200,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  itemBox: { padding: 14, borderRadius: 8, borderWidth: 1, marginBottom: 10 },
  itemHeading: { fontSize: 15, fontWeight: 'bold' },
  itemSub: { fontSize: 12, marginVertical: 4, fontWeight: '600' },
  itemDesc: { fontSize: 12, lineHeight: 17 },
  gearItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  gearName: { fontSize: 13, fontWeight: '700' },
  gearSub: { fontSize: 9, fontWeight: 'bold', marginTop: 2 },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  creditTitle: { fontSize: 13, fontWeight: '700' },
  creditType: { fontSize: 11 },
});
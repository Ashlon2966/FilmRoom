import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ClapperSlate({
  production = 'UNTITLED FILM',
  director = 'N/A',
  camera = 'A',
  scene = '1',
  shot = 'A',
  take = 1,
}) {
  return (
    <View style={styles.slateContainer}>
      {/* Clapper Striped Top Bar */}
      <View style={styles.clapperTop}>
        <View style={styles.stripe} />
        <View style={[styles.stripe, styles.stripeDark]} />
        <View style={styles.stripe} />
        <View style={[styles.stripe, styles.stripeDark]} />
        <View style={styles.stripe} />
      </View>

      {/* Title Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.prodTitle} numberOfLines={1}>
          {production.toUpperCase()}
        </Text>
      </View>

      {/* Directors & Camera Info */}
      <View style={styles.rowBorder}>
        <View style={styles.metaCell}>
          <Text style={styles.cellLabel}>DIRECTOR</Text>
          <Text style={styles.cellVal} numberOfLines={1}>{director}</Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.cellLabel}>CAMERA</Text>
          <Text style={styles.cellVal}>{camera}</Text>
        </View>
      </View>

      {/* Slate Big Numbers (Scene, Shot, Take) */}
      <View style={styles.slateGrid}>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>SCENE</Text>
          <Text style={styles.gridValue}>{scene}</Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>SHOT</Text>
          <Text style={styles.gridValue}>{shot}</Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>TAKE</Text>
          <Text style={[styles.gridValue, styles.takeColor]}>{take}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slateContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
    overflow: 'hidden',
    marginVertical: 10,
  },
  clapperTop: {
    flexDirection: 'row',
    height: 18,
    backgroundColor: '#ffffff',
  },
  stripe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  stripeDark: {
    backgroundColor: '#000000',
    transform: [{ skewX: '-25deg' }],
  },
  sectionHeader: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  prodTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  rowBorder: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#333333',
  },
  metaCell: {
    flex: 1,
    padding: 6,
    borderRightWidth: 1,
    borderColor: '#333333',
  },
  cellLabel: {
    color: '#777777',
    fontSize: 9,
    fontWeight: 'bold',
  },
  cellVal: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  slateGrid: {
    flexDirection: 'row',
    height: 70,
  },
  gridCell: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLabel: {
    color: '#888888',
    fontSize: 10,
    fontWeight: 'bold',
    position: 'absolute',
    top: 6,
  },
  gridValue: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 8,
  },
  takeColor: {
    color: '#ffd700',
  },
});
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { TrendingUp, Wallet, CheckCircle, Briefcase, Clock, ChevronRight, Bell, Award } from 'lucide-react-native';
import { COLORS, SPACING, SIZES, SHADOWS } from '../../constants/Theme';
import { Typography } from '../../components/UI/Typography';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <Card style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
    <View style={styles.statHeader}>
      <Typography variant="caption" color={COLORS.gray[500]} weight="bold">{title}</Typography>
      <Icon size={20} color={color} />
    </View>
    <Typography variant="h3" weight="bold" color={COLORS.text.primary} style={{ marginTop: 8 }}>{value}</Typography>
  </Card>
);

export default function ProfessionalDashboard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['professional-dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard');
      return response.data?.data;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const earnings = data?.professional_earnings || 0;
  const balance = data?.wallet?.balance || 0;
  const completed = data?.recent_professional_jobs?.length || 0;
  const available = data?.available_professional_requests?.length || 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Typography variant="h2" weight="bold">Pro Console</Typography>
          <View style={styles.statusBadge}>
            <Award size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Typography variant="caption" color={COLORS.primary} weight="bold">PROFESSIONAL</Typography>
          </View>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <Bell color={COLORS.gray[800]} size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <StatCard title="EARNINGS" value={`R${earnings.toFixed(2)}`} icon={TrendingUp} color={COLORS.primary} />
        <StatCard title="WALLET" value={`R${balance.toFixed(2)}`} icon={Wallet} color={COLORS.secondary} />
        <StatCard title="COMPLETED" value={completed} icon={CheckCircle} color="#8B5CF6" />
        <StatCard title="OPEN CASES" value={available} icon={Briefcase} color={COLORS.accent} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Typography variant="h3" weight="bold">Recent Cases</Typography>
          <TouchableOpacity>
            <Typography variant="label" color={COLORS.primary}>View History</Typography>
          </TouchableOpacity>
        </View>

        {data?.recent_professional_jobs?.length > 0 ? (
          data.recent_professional_jobs.map((job: any) => (
            <Card key={job.id} shadow="sm" style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Briefcase size={20} color={COLORS.gray[400]} />
              </View>
              <View style={styles.activityInfo}>
                <Typography variant="subtitle" weight="bold">
                  {job.details?.service_name || 'Consultation'}
                </Typography>
                <View style={styles.activityMeta}>
                  <Typography variant="caption" color={COLORS.gray[500]}>
                    {new Date(job.created_at).toLocaleDateString()}
                  </Typography>
                  <View style={styles.dot} />
                  <Typography variant="caption" color={COLORS.gray[500]}>Finished</Typography>
                </View>
              </View>
              <View style={styles.activityAmount}>
                <Typography variant="subtitle" weight="bold" color={COLORS.primary}>
                  R{job.payment_amount?.toFixed(2)}
                </Typography>
                <ChevronRight size={16} color={COLORS.gray[300]} style={{ marginLeft: 8 }} />
              </View>
            </Card>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Briefcase size={48} color={COLORS.gray[200]} />
            <Typography variant="body" color={COLORS.gray[400]} style={{ marginTop: 12 }}>
              No recent cases found.
            </Typography>
          </View>
        )}
      </View>

      <Button
        title="Browse New Cases"
        onPress={() => { }}
        icon={<Briefcase color={COLORS.white} size={20} />}
        style={styles.actionButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: SPACING.xl,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  iconButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.gray[50],
    borderRadius: SIZES.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: SPACING.md,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.gray[300],
    marginHorizontal: 8,
  },
  activityAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.xxl,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.lg,
  },
  actionButton: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
});

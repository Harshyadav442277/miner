/** Share concurrent identical reads only; completed answers are never retained. */
export class Inflight<T extends object> {
  private groups = new Map<string, Set<T>>();
  private membership = new WeakMap<T, { key: string; group: Set<T> }>();

  constructor(private maxGroups = 500, private maxFollowers = 100) {}

  join(key: string, caller: T): boolean {
    let group = this.groups.get(key);
    if (group && group.size >= this.maxFollowers + 1) return false;
    const follows = !!group;
    if (!group) {
      if (this.groups.size >= this.maxGroups) return false;
      group = new Set<T>();
      this.groups.set(key, group);
    }
    group.add(caller);
    this.membership.set(caller, { key, group });
    return follows;
  }

  finish(caller: T): T[] {
    const member = this.membership.get(caller);
    if (!member) return [];
    const { key, group } = member;
    // A follower's own timeout must not terminate the leader's work.
    if (group.values().next().value !== caller) {
      group.delete(caller);
      this.membership.delete(caller);
      return [];
    }
    this.groups.delete(key);
    const followers = [...group].filter(value => value !== caller);
    for (const value of group) this.membership.delete(value);
    return followers;
  }
}

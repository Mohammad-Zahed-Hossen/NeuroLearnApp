export class HabitFormationService {
  private static instance: HabitFormationService;
  private constructor() {}
  public static getInstance() {
    if (!HabitFormationService.instance) HabitFormationService.instance = new HabitFormationService();
    return HabitFormationService.instance;
  }
  public async initialize() { return Promise.resolve(true); }
  public async suggestHabits(context: any) { return Promise.resolve([]); }
}
export default HabitFormationService;

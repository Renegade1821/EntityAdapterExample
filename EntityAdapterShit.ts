interface ConfigEntity {
    id: string;
    key: string;
    createdAt: string;
    // etc...
}


interface FooEntity extends ConfigEntity {
    property1: any;
    property2: any;
    property3: FooSubData;
    someObjectProperty: any;
}

interface FooSubData {
    subProperty1: any;
    subProperty2: any;
    subProperty3: any;
}



abstract class BaseForm<T> {

    entity: T;
    isNew: boolean;

    constructor(data = {}, isNew = false) {
        this.entity = data;
        this.id = data.id || id4();
        // etc...
    }

    abstract sync(): T

}

// is used to have nicer form of data to use in UI components
class FooFormModel extends BaseForm<FooEntity> {
    property1: any;
    property2: any;
    property3Sub1: any;
    property3Sub2: any;
    property3Sub3: any;
    nicerObjectProp1: any
    nicerObjectProp2: any

    constructor(data: FooEntity = {}, isNew = false) {
        super(data, isNew);

        this.property1 = data.property1 || 'default_value_for_this';
        this.property2 = data.property2 || 'default_value_for_this';
        this.property3Sub1 = data.property3?.subProperty1 || 'default_value_for_this';
        this.property3Sub2 = data.property3?.subProperty2 || 'default_value_for_this';
        this.property3Sub3 = data.property3?.subProperty3 || 'default_value_for_this';
        this.convertToNicerObjectProp(data.someObjectProperty);
    }

    convertToNicerObjectProp(someObjectProperty: any) {
        this.nicerObjectProp1 = someObjectProperty['whatever'];
        this.nicerObjectProp2 = someObjectProperty['whatever2'];
    }

    sync(): FooEntity {
        // converts data back to FooEntity
    }

}

type SortFunction<T> = (a: any, b: any) => number;
type Entities<T> = { [id: string]: T };
type Patches<T> = { [id: string]: Partial<T> };

interface EntityAdapterState<T> {
    ids: string[];
    entities: Entities<T>;
    patches: Patches<T>;
}

class EntityAdapter<T> {
    sortFn: SortFunction;

    constructor(sortFn: SortFunction) {}

    getInitialState(): EntityAdapterState<T> {
        return {
            ids: [],
            entities: {},
            patches: {},
        }
    }

    // 
    getOne(id: string, state: EntityAdapterState<T>): T { /* return one entity */ }
    getAll(state: EntityAdapterState<T>): T[] { /* return all entity */ }
    getPatch(id: string, state: EntityAdapterState<T>): Partial<T> { /* return one patch */ }
    getPatches(state: EntityAdapterState<T>): Partial<T>[] { /* return all patches */ }
    getPatchedOne(id: string,state: EntityAdapterState<T>): T{ /* return one patch entity */ }
    getPatchedEntities(state: EntityAdapterState<T>): T[] { /* return all patched entities */ }
    getCount(): number { /* return length of list */ }
    getIds(): string[] { /* return ids */ }

    upsertEntity(entity: T, state: EntityAdapterState<T>): EntityAdapterState<T> {
        return {
            ...state,
            ids: [
                ...state.ids,
                entity.id,
            ],
            entities: {
                ...state.entities,
                [entity.id]: entity,
            },
        };
    }

    updateEntity(update: Partial<T>, state: EntityAdapterState<T>): EntityAdapterState<T> {
        return {
            ...state,
            patches: {
                ...state.patches,
                [update.id]: {
                    ...update,
                },
            },
        };
    }
    /**
     * set entities
     * upsert entity => create new entry or update
     * patch entity
     * delete entity
     */
}

@Singelton /* custom writte singelton decorator which returns a singleton of this class if already initalized */ 
class FormModelEntityAdapter<T> extends EntityAdapter<T> {
    constructor() {
        super(/* optional sorting function */)
    }
}


/* VuexModule is a module of vuex (vues redux shit) */
class FormModelModule<Entity extends ConfigEntity, FormModel extends BaseForm<Entity>> extends VuexModule {
    public formModelState = this.formModelEntityAdapter.getInitialState();
    private apiService = new ApiService() /* also served as singleton */ 

    get formModelEntityAdapter<FormModel>() {
        return new FormModelEntityAdapter<FormModel>();
    }

    
    // THIS ARE ALL GETTERS
    getPatchesOne(id: string): FormModel {
        return this.formModelEntityAdapter.getPatchedOne(id, this.formModelState);
    }
    /** 
     * more or less the same functions as the adapter
     */

    /**
     * MUTATION 
     * 
     * redux reducer which change state 
     */
    @Mutation
    private UPDATE_FORM_MODEL([id, update]: [string, Partial<FormModel>]) {
        this.formModelState = this.formModelEntityAdapter.updateEntity(update, this.formModelState);
    }

    @Mutation
    private UPSERT_FORM_MODEL(entity: FormModel) {
        this.formModelState = this.formModelEntityAdapter.upsertEntity(update, this.formModelState);
    }


    /**
     * ACTIONS
     * 
     * same as in redux
     */

    @Action
    public updateFormModel([id, update]: [string, Partial<FormModel>]) {
        this.UPDATE_FORM_MODEL(update);
    }

    @Action
    public upsertFormModel(entity: FormModel) {
        this.UPSERT_FORM_MODEL(entity);
    }

    /**
     * API CALLS
     */
    public async saveFormModel(id: string) {
        const form = this.getPatchesOne(id);
        const response = await this.apiService.save(form);
        this.upsertFormModel(response.date);
    }
}

@Module
class FooFormModelModule extends FormModelModule<FooEntity, FooFormModel> {

}

class FormComponent extends Vue {
    private id = '123' // pseudo ID comes from param from route or somewhere else idc
    private formModule: FooFormModelModule = new FooFormModelModule({ store, name: 'facets'});

    private get form() {
        this.formModule.getPatchesOne(this.id);
    }

    updateFormFunction(update: Partial<FooFormModel>) {
        this.formModule.updateFormModel(this.id, update);
    }

    saveForm() {
        this.formModule.saveFormModel(this.id);
    }

}